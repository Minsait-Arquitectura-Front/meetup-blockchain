const express = require('express');
const cors = require('cors');
const { Web3 } = require('web3');

const app = express();
const port = 3000;

// Configura Web3 para conectarse a un nodo de Ethereum que está ejecutándose en la dirección especificada. 
// En este caso, se está conectando a Ganache, un entorno de desarrollo de blockchain local.
const web3 = new Web3('http://127.0.0.1:7545');

app.use(express.json());
app.use(cors());

// Esta ruta manejará las solicitudes de envío de transacciones.
app.post('/send', async (req, res) => {
    try {
        const { from, to, amount } = req.body;

        // Validación de las direcciones 'from' y 'to' que deben de ser direcciones de Ethereum válidas.
        const addressRegex = /^0x[a-fA-F0-9]{40}$/;
        if (!addressRegex.test(from) || !addressRegex.test(to)) {
            return res.status(400).send('Invalid sender or receiver address');
        }

        // Validación de 'from' o el remitente, este deberá de ser una de las cuentas de Ethereum que se está ejecutando en el nodo.
        const accounts = await web3.eth.getAccounts();
        if (!accounts.includes(from)) {
            return res.status(400).send('Invalid sender address');
        }

        // Validación de 'amount' o el valor a enviar, este deberá de ser un número positivo mayor que 0.
        const amountNumber = parseFloat(amount);
        if (isNaN(amountNumber) || amountNumber <= 0) {
            return res.status(400).send('Invalid amount');
        }

        // Recogemos un porcentaje de la cantidad a enviar para cubrir los costos de la transacción.
        const amountInWei = web3.utils.toWei(amount.toString(), 'ether');
        const commission = (amountInWei * 0.01) / 100;
        // Comparar la comisión con el mínimo permitido.
        const MINIMUM_COMMISSION = web3.utils.toWei('0.0001', 'ether');
        if (commission < MINIMUM_COMMISSION) {
            return res.status(400).send('Amount too low');
        }

        // Enviar comisión a la cuenta de administración.
        const COMMISSION_ACCOUNT = '0xa2D90396f7a0271B54b947979Ea35Ff79167cFb8';
        await web3.eth.sendTransaction({
            from: from,
            to: COMMISSION_ACCOUNT,
            value: web3.utils.toWei('1', 'ether') //commission
        });

        // Enviar el monto restante a la cuenta destinataria.
        const transaction = await web3.eth.sendTransaction({
            from: from,
            to: to,
            value: amountInWei
        });

        res.send(`Transaction successful with hash: ${transaction.transactionHash}`);
    } catch (error) {
        res.status(500).send(`Transaction failed: ${error.message}`);
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
