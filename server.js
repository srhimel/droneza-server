const express = require('express')
require('dotenv').config()
const app = express();
const port = process.env.PORT || 5000;
const cors = require('cors');
const { MongoClient } = require('mongodb');
const admin = require("firebase-admin");
const ObjectId = require('mongodb').ObjectId;

//middleware
app.use(cors());
app.use(express.json());

//firebase admin

const serviceAccount = JSON.parse(process.env.SERVICE_ACCOUNT);

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.pt0xz.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });


async function verifyToken(req, res, next) {
    if (req.headers?.authorization?.startsWith('Bearer ')) {
        const token = req.headers?.authorization.split(' ')[1];
        try {
            const decodedUser = await admin.auth().verifyIdToken(token);
            req.decodeEmail = decodedUser.email;
        }
        catch { }
    }
    next();
}

const run = async () => {
    try {
        await client.connect();
        const database = client.db("droneZa");
        const userCollection = database.collection('users');
        const productCollection = database.collection('product');
        const feedbackCollection = database.collection('feedbacks');
        const orderCollection = database.collection('orders');



        app.get('/my-order', verifyToken, async (req, res) => {
            const email = req.query.email;
            const requester = req.decodeEmail;
            if (requester) {
                const requesterAccount = await userCollection.findOne({ email: requester });

                if (requesterAccount.email === email) {
                    const query = { email: email }
                    const result = await orderCollection.find(query).toArray();
                    res.send(result);
                }
            }
            else {
                res.status(403).json({ message: 'You do not have access' })
            }


        })

        app.post('/orders', async (req, res) => {
            const feedback = req.body;
            const result = await orderCollection.insertOne(feedback);
            res.json(result);
        })
        app.get('/orders', async (req, res) => {
            const result = await orderCollection.find({}).toArray();
            res.send(result);
        })
        // delete api 
        app.delete('/orders/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await orderCollection.deleteOne(query);
            res.json(result);
        })
        //update api



        app.put('/orders/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) }
            const options = { upsert: true };
            const updateDoc = {
                $set: {
                    status: 'accepted'
                }
            }
            const result = await orderCollection.updateOne(filter, updateDoc, options);
            res.json(result);
        })


        app.post('/feedbacks', async (req, res) => {
            const feedback = req.body;
            const result = await feedbackCollection.insertOne(feedback);
            res.json(result);
        })
        app.get('/feedbacks', async (req, res) => {
            const result = await feedbackCollection.find({}).toArray();
            res.send(result);
        })


        // save product to db
        app.post('/products', async (req, res) => {
            const product = req.body;
            const result = await productCollection.insertOne(product);
            res.json(result);
        })

        app.get('/products', async (req, res) => {
            const id = req.params;
            let query = {}
            const result = await productCollection.find(query).toArray();
            res.send(result);
        })
        // get one api
        app.get('/product/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) }
            const result = await productCollection.findOne(query);
            res.send(result);
        })

        // delete api 
        app.delete('/products/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await productCollection.deleteOne(query);
            res.json(result);
        })

        //update api

        app.put('/products/:id', async (req, res) => {
            const id = req.params.id;
            const productNew = req.body;
            const filter = { _id: ObjectId(id) }
            const options = { upsert: true };
            const updateDoc = {
                $set: {
                    image: productNew.image,
                    title: productNew.title,
                    price: productNew.price,
                    desc: productNew.desc,
                    rating: productNew.rating,
                    reviews: productNew.reviews,
                }
            }
            const result = await productCollection.updateOne(filter, updateDoc, options);
            res.json(result);
        })


        // save user to db

        app.post('/users', async (req, res) => {
            const user = req.body;
            const result = await userCollection.insertOne(user);
            res.json(result);
        })

        app.put('/users', async (req, res) => {
            const user = req.body;
            const query = { email: user.email }
            const update = { $set: user }
            const options = { upsert: true }
            const result = await userCollection.updateOne(query, update, options);
            res.json(result);
            console.log(result)
        })
        app.put('/users/admin', verifyToken, async (req, res) => {
            const user = req.body;
            const requester = req.decodeEmail;
            if (requester) {
                const requesterAccount = await userCollection.findOne({ email: requester });
                if (requesterAccount.role === 'admin') {
                    const query = { email: user.email }
                    const update = { $set: { role: 'admin' } }
                    const result = await userCollection.updateOne(query, update)
                    res.json(result);
                    console.log(result);
                }
            }
            else {
                res.status(403).json({ message: 'You do not have access' })
            }

        })

        app.get('/users/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email }
            const result = await userCollection.findOne(query);
            let isAdmin = false;
            if (result?.role === 'admin') {
                isAdmin = true;
            }
            res.send({ admin: isAdmin });
        })


    }
    finally {
        // await client.close();
    }
}

run().catch(console.dir);



app.get('/', (req, res) => {
    res.send('Hello World');
})

app.listen(port, () => {
    console.log('server is running');
})