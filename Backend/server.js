const express = require('express');
const cors = require('cors');
const mysql = require('mysql');
const bodyParser = require('body-parser');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

// Создаем экземпляр приложения Express
const app = express();
app.use(cors());
app.use(bodyParser.json());

// Настройка подключения к базе данных MySQL
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'jobTest',
});

db.connect(err => {
    if (err) throw err;
    console.log('MySQL connected...');
});

// Переменная для хранения номера для уведомлений (замените на реальный номер)
let notificationNumber = '77077559309';

// Маршрут для проверки работы сервера
app.get('/', function (req, res) {
    return res.json("From backend");
});

// Маршрут для сохранения данных из фронтенда в базу данных
app.post('/save', function (req, res) {
    const nodes = req.body.nodes;
    const edges = req.body.edges;
    const sql = "INSERT INTO botData (nodes, edges) VALUES (?, ?)";
    db.query(sql, [JSON.stringify(nodes), JSON.stringify(edges)], function (err, result) {
        if (err) return res.json(err);
        return res.json({ message: 'Data saved', id: result.insertId });
    });
});

// Маршрут для обновления номера для уведомлений
app.post('/updateNotificationNumber', function (req, res) {
    const newNumber = req.body.number;
    if (/^\d+$/.test(newNumber)) {
        notificationNumber = newNumber;
        return res.json({ message: 'Notification number updated', number: notificationNumber });
    } else {
        return res.status(400).json({ error: 'Invalid number format' });
    }
});

// Создание экземпляра клиента WhatsApp с автоматическим сохранением сессии
const client = new Client({
    authStrategy: new LocalAuth()
});

// Обработчик события для генерации QR-кода при аутентификации
client.on('qr', qr => {
    qrcode.generate(qr, { small: true });
});

// Обработчик события, когда клиент готов к работе
client.on('ready', () => {
    console.log('Client is ready!');
});

// Обработка входящих сообщений от пользователей
client.on('message', async msg => {
    const contact = await msg.getContact();
    const name = contact.pushname || contact.name || 'Неизвестный пользователь';
    const phone = contact.number;

    if (msg.body === '/консультация') {
        msg.reply(`Здравствуйте. Ваша заявка на консультацию принята. Как вам удобно переговорить устно или перепиской?\nwa.me/${notificationNumber}?text=/позвоните_мне\nwa.me/${notificationNumber}?text=/напишите_мне`);

        const checkSql = "SELECT * FROM botData WHERE phone = ?";
        db.query(checkSql, [phone], function (err, result) {
            if (err) {
                console.error('Error checking existing data:', err);
                return;
            }

            const currentDate = new Date();
            if (result.length > 0) {
                // Обновление существующей записи
                const updateSql = "UPDATE botData SET name = ?, action = ?, date = ? WHERE phone = ?";
                db.query(updateSql, [name, 'Ожидание выбора', currentDate, phone], function (err, result) {
                    if (err) {
                        console.error('Error updating data:', err);
                    } else {
                        console.log('Data updated:', result.affectedRows);
                    }
                });
            } else {
                // Вставка новой записи
                const insertSql = "INSERT INTO botData (name, phone, action, date) VALUES (?, ?, ?, ?)";
                db.query(insertSql, [name, phone, 'Ожидание выбора', currentDate], function (err, result) {
                    if (err) {
                        console.error('Error inserting data:', err);
                    } else {
                        console.log('Data saved:', result.insertId);
                    }
                });
            }
        });
    } else if (msg.body === '/позвоните_мне' || msg.body === '/напишите_мне') {
        const action = msg.body === '/позвоните_мне' ? 'Позвонить' : 'Написать';

        const updateSql = "UPDATE botData SET action = ? WHERE phone = ?";
        db.query(updateSql, [action, phone], function (err, result) {
            if (err) {
                console.error('Error updating action:', err);
            } else {
                console.log('Action updated:', result.affectedRows);
            }
        });

        const nameQuery = "SELECT name FROM botData WHERE phone = ?";
        db.query(nameQuery, [phone], function (err, result) {
            if (err) {
                console.error('Error fetching name:', err);
            } else {
                const name = result[0].name;

                msg.reply('Ок. Первый освободившийся менеджер сразу же с вами свяжется. Спасибо за обращение.');

                // Проверьте, правильно ли форматирован номер
                const notificationWid = `${notificationNumber}@c.us`;
                if (/^\d+@c\.us$/.test(notificationWid)) {
                    const notificationMessage = `Человек по имени ${name} (${phone}) оставил заявку на получение консультации (${action}). Необходимо с ним связаться. Дата и время заявки: ${new Date().toLocaleString()}.`;
                    client.sendMessage(notificationWid, notificationMessage).catch(err => {
                        console.error('Error sending message:', err);
                    });
                } else {
                    console.error('Invalid notification number format:', notificationWid);
                }
            }
        });
    }
});

// Запуск сервера на порту 8081
app.listen(8081, () => {
    console.log("Server started on port 8081");
});

// Инициализация клиента WhatsApp
client.initialize();
