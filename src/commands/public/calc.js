export default {
    name: "calc",
    aliases: ["calcular", "cal", "mat"],
    description: "Realiza operações matemáticas (+ - * /)",
    category: "fun",

    async run({ sock, msg, args }) {

        const from = msg.key.remoteJid;
        const pushName = msg.pushName || "Usuário";

        await sock.sendMessage(from, { react: { text: "⏳", key: msg.key } });

        try {

            if (args.length < 3) {
                return await sock.sendMessage(
                    from,
                    { text: "❌ Uso correto:\n!calc 10 + 5\n!calc 10 - 5\n!calc 10 * 5\n!calc 10 / 5" },
                    { quoted: msg }
                );
            }

            const num1 = parseFloat(args[0]);
            const operador = args[1];
            const num2 = parseFloat(args[2]);

            if (isNaN(num1) || isNaN(num2)) {
                return await sock.sendMessage(
                    from,
                    { text: "❌ Digite números válidos." },
                    { quoted: msg }
                );
            }

            let resultado;

            switch (operador) {

                case "+":
                    resultado = num1 + num2;
                    break;

                case "-":
                    resultado = num1 - num2;
                    break;

                case "*":
                case "x":
                    resultado = num1 * num2;
                    break;

                case "/":
                    if (num2 === 0) {
                        return await sock.sendMessage(
                            from,
                            { text: "❌ Não é possível dividir por zero." },
                            { quoted: msg }
                        );
                    }
                    resultado = num1 / num2;
                    break;

                default:
                    return await sock.sendMessage(
                        from,
                        { text: "❌ Operador inválido. Use + - * /" },
                        { quoted: msg }
                    );
            }

            const resposta =
`🧮 *Calculadora*

👤 ${pushName}
📌 ${num1} ${operador} ${num2}

✅ Resultado: *${resultado}*`;

            await sock.sendMessage(
                from,
                { text: resposta },
                { quoted: msg }
            );

            await sock.sendMessage(from, { react: { text: "✅", key: msg.key } });

        } catch (err) {

            console.error("Erro no comando calc:", err);

            await sock.sendMessage(from, { react: { text: "❌", key: msg.key } });

            await sock.sendMessage(
                from,
                { text: "❌ Ocorreu um erro ao calcular." },
                { quoted: msg }
            );
        }
    }
};