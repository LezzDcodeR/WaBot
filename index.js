const {
    makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    makeInMemoryStore,
    getContentType
} = require("@fizzxydev/baileys-pro")
const pino = require("pino")
const readline = require("readline")
const chalk = require("chalk")

const input = (teks) => {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    })
    return new Promise((kontol) => {
        rl.question(teks, (memeq) => {
            rl.close()
            kontol(memeq)
        })
    })
}

async function startBot() {
        const store = makeInMemoryStore({
            logger: pino().child({
                level: 'silent',
                stream: 'store'
            })
        })
        const {
            state,
            saveCreds
        } = await useMultiFileAuthState('./sesi_bot')

        const ade = makeWASocket({
            printQRInTerminal: false,
            keepAliveIntervalMs: 30000,
            logger: pino({
                level: "silent"
            }),
            auth: state,
            browser: ['Ubuntu', 'Chrome', '20.0.04'],
        })

        if (!ade.authState.creds.registered) {
            let phoneNumber = await input(chalk.blue.bold(`Enter Your Phone Number: `))
            phoneNumber = phoneNumber.replace(/[^0-9]/g, '')
            let code = await ade.requestPairingCode(phoneNumber.trim(), "ZYCODERX")
            console.log(chalk.blue.bold(`Your Pairing Code: ${code}`))
        }
        ade.ev.on('creds.update', saveCreds)
        store.bind(ade.ev)

        ade.ev.on('connection.update', (update) => {
            const {
                connection,
                lastDisconnect
            } = update

            if (connection === 'open') {
                console.log(chalk.blue.bold('Berhasil Terhubung Ke WhatsApp ✅'))
            }

            if (connection === 'close') {
                const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut
                console.log(chalk.red.bold('Connection Close' + shouldReconnect ? 'Reconnectinng....' : 'Please Reconmect Again'))
                if (shouldReconnect) {
                    startBot()
                }
            }
        })

        ade.ev.on("messages.upsert", async (meq) => {
        const m = meq.messages[0]
        if (!m.message) return //biar ga anu pesan kosong © om rojak🗿
        if (m.key.remoteJid === 'status@broadcast') return //kata om rojak gw ini biar lu ga respon pesan dari status wangsaff
        const type = getContentType(m.message)
        let teks = m.message.conversation || m.message.extendedTextMessage?.text
            console.log(chalk.green.bold(`> NEW MESSAGE\n`)+chalk.magenta.bold(`MESSAGE: ${type}\nPENGIRIM: ${m.key.remoteJid} ( ${m.pushName} )`))
               if (teks === "bot") {
                     await  ade.sendMessage(m.key.remoteJid, { text: "Bot Online✅" }, { quoted: m})
                   }
        })
}

startBot()
