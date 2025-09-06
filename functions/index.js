const functions = require('firebase-functions');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');
const axios = require('axios');

admin.initializeApp();

exports.sendEmail = functions.region('europe-west6').https.onRequest(async (req, res) => {
    // Check if the request is a POST request
    if (req.method !== 'POST') {
        await new Promise(resolve => setTimeout(resolve, 5_000));
        res.status(405).send('Method Not Allowed');
        return;
    }

    const apiKeyParam = req.header("apiKey");
    const collectionParam = req.body.collection;
    const documentParam = req.body.document;
    const emailParam = req.body.email;
    const messageParam = req.body.message;
    const userSubject = req.body.userSubject;
    const restaurantSubject = req.body.restaurantSubject;

    if (!apiKeyParam || !collectionParam || !documentParam || !emailParam || !messageParam || !userSubject || !restaurantSubject) {
        await new Promise(resolve => setTimeout(resolve, 5_000));
        res.status(400).send(`Bad request`);
        return;
    }

    let doc = await admin.firestore().collection(collectionParam).doc(documentParam).get();
    let document = doc.data()
    let emailSettings = document.config.email;

    let apiKey = emailSettings.apiKey

    if (apiKey !== apiKeyParam) {
        // prevent bruteforce
        await new Promise(resolve => setTimeout(resolve, 60_000));
        res.status(400).send('apiKey incorrect');
        return;
    }

    const transporter = nodemailer.createTransport({
        host: emailSettings.properties['mail.smtp.host'],
        port: emailSettings.properties['mail.smtp.port'],
        secure: false,
        auth: {
            user: emailSettings.sender,
            pass: emailSettings.senderPassword,
        },
        tls: {
            ciphers: 'SSLv3'
        }
    });

    const mailOptionsUser = {
        from: emailSettings.sender,
        to: emailParam,
        subject: userSubject,
        html: messageParam,
    };

    const mailOptionsRestaurant = {
        from: emailSettings.sender,
        to: document.config.restaurant.restaurantConfirmationEmail,
        subject: restaurantSubject,
        html: messageParam,
    };

    transporter.sendMail(mailOptionsUser, (err, data) => {
        if (err) {
            res.status(500).send(err);
            return;
        }

        transporter.sendMail(mailOptionsRestaurant, (err, data) => {
            if (err) {
                res.status(500).send(err);
                return;
            }

            res.send('Emails sent successfully');
        });
    });
});

exports.addOrderPrice = functions.region('europe-west6').https.onRequest(async (req, res) => {
    // Check if the request is a POST request
    if (req.method !== 'POST') {
        await new Promise(resolve => setTimeout(resolve, 5_000));
        res.status(405).send('Method Not Allowed');
        return;
    }

    const apiKeyParam = req.header("apiKey");
    const collectionParam = req.body.collection;
    const documentParam = req.body.document;
    const price = req.body.price;

    if (!apiKeyParam || !collectionParam || !documentParam || !price) {
        await new Promise(resolve => setTimeout(resolve, 5_000));
        res.status(400).send(`Bad request`);
        return;
    }

    let docRef = admin.firestore().collection(collectionParam).doc(documentParam);
    let doc = await docRef.get();
    let document = doc.data()
    let apiKey = document.config.email.apiKey;

    if (apiKey !== apiKeyParam) {
        // prevent bruteforce
        await new Promise(resolve => setTimeout(resolve, 60_000));
        res.status(400).send('apiKey incorrect');
        return;
    }

    await docRef.update({ 'commission.cumulatedOrdersPrice': admin.firestore.FieldValue.increment(price) });

    res.send('Field adjusted successfully by '+price);
});

exports.sendWhatsApp = functions.region('europe-west6').https.onRequest(async (req, res) => {
    // Check if the request is a POST request
    if (req.method !== 'POST') {
        await new Promise(resolve => setTimeout(resolve, 5_000));
        res.status(405).send('Method Not Allowed');
        return;
    }

    const apiKeyParam = req.header("apiKey");
    const collectionParam = req.body.collection;
    const documentParam = req.body.document;
    const phoneNumberParam = req.body.phoneNumber;

    const userTitleParam = req.body.userTitle;
    const restaurantTitleParam = req.body.restaurantTitle;
    const message0 = req.body.messageFirst;
    const message1 = req.body.messageSecond;
    const message2 = req.body.messageThird;
    const message3 = req.body.messageFourth;
    const message4 = req.body.messageFifth;
    const message5 = req.body.messageSixth;
    const languageParam = req.body.language;

    if (!apiKeyParam || !collectionParam || !documentParam || !phoneNumberParam || !userTitleParam || !restaurantTitleParam
        || !message0 || !message1 || !message2 || !message3 || !message4 || !message5 || !languageParam) {
        await new Promise(resolve => setTimeout(resolve, 5_000));
        res.status(400).send(`Bad request`);
        return;
    }

    let doc = await admin.firestore().collection(collectionParam).doc(documentParam).get();
    let document = doc.data()
    let whatsAppSettings = document.config.whatsapp;

    let apiKey = whatsAppSettings.apiKey

    if (apiKey !== apiKeyParam) {
        // prevent bruteforce
        await new Promise(resolve => setTimeout(resolve, 60_000));
        res.status(400).send('apiKey incorrect');
        return;
    }

    const url = whatsAppSettings.metaEndpoint.url;
    const token = whatsAppSettings.token;
    const templateName = whatsAppSettings.templateName;

    const userJsonPayload = {
        messaging_product: "whatsapp",
        to: phoneNumberParam,
        type: "template",
        template: {
            name: templateName,
            language: {
                code: languageParam,
            },
            components: [
                {
                    type: "header",
                    parameters: [
                        {
                            type: "text",
                            text: userTitleParam,
                        },
                    ],
                },
                {
                    type: "body",
                    parameters: [
                        {
                            type: "text",
                            text: message0,
                        },
                        {
                            type: "text",
                            text: message1,
                        },
                        {
                            type: "text",
                            text: message2,
                        },
                        {
                            type: "text",
                            text: message3,
                        },
                        {
                            type: "text",
                            text: message4,
                        },
                        {
                            type: "text",
                            text: message5,
                        },
                    ],
                },
            ],
        },
    };

    const restaurantJsonPayload = {
        messaging_product: "whatsapp",
        to: document.config.restaurant.phoneNumber,
        type: "template",
        template: {
            name: templateName,
            language: {
                code: languageParam,
            },
            components: [
                {
                    type: "header",
                    parameters: [
                        {
                            type: "text",
                            text: restaurantTitleParam,
                        },
                    ],
                },
                {
                    type: "body",
                    parameters: [
                        {
                            type: "text",
                            text: message0,
                        },
                        {
                            type: "text",
                            text: message1,
                        },
                        {
                            type: "text",
                            text: message2,
                        },
                        {
                            type: "text",
                            text: message3,
                        },
                        {
                            type: "text",
                            text: message4,
                        },
                        {
                            type: "text",
                            text: message5,
                        },
                    ],
                },
            ],
        },
    };

    const axiosMethod = whatsAppSettings.metaEndpoint.method.toLowerCase();

    try {
        const userRequest = axios[axiosMethod](url, userJsonPayload, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });
        const restaurantRequest = axios[axiosMethod](url, restaurantJsonPayload, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });

        Promise.all([userRequest, restaurantRequest])
            .then(() => {
                return res.send("WhatsApp messages sent successfully!");
            })
            .catch((error) => {
                console.error(error);
                return res.status(500).send(error.response ? error.response.data : 'Error sending message');
            });

    } catch (error) {
        console.error(error);
        return res.status(500).send(error.response ? error.response.data : 'Error sending message');
    }
});