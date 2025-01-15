const express = require('express')
const cors = require('cors')
require('dotenv').config();
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion } = require('mongodb');
const app = express()
const port = process.env.PORT || 9000

app.use(cors())
app.use(express.json())
app.get('/', (req, res) => {
    res.send(`server running on port ${port} `)
})

const Verification = async (req, res, next) => {
    if (!req.headers.authorization) {
        return res.status(401).send({ message: 'Unauthorized Access' })
    }
    const token = req.headers.authorization.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECURE, (err, decoded) => {
        if (err) {
            return res.status(401).send({ message: 'unauthorized Access' })
        }
        req.user = decoded
        next()
    })
}

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.xihi8.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        // await client.connect();
        // Send a ping to confirm a successful connection
        // await client.db("admin").command({ ping: 1 });

        const userCollection = client.db('employee').collection('users')
        const reviewCollection = client.db('employee').collection('reviews')
        const firedCollection = client.db('employee').collection('fireds')


        //  token Related APIs
        app.post('/jwt', async (req, res) => {
            const data = req.body;
            const token = jwt.sign(data, process.env.ACCESS_TOKEN_SECURE, {
                expiresIn: '10h'
            })
            res.send({ token })
        })

        // verify admin 
        const verifyAdmin = async (req, res, next) => {
            const email = req.user.email;
            const query = { email: email };
            const isAdmin = await userCollection.findOne(query);
            if (!isAdmin.role === 'admin') {
                return res.status(403).send({ message: 'forbidden Access can not verify admin' })
            }
            next()
        }
        // verify HR 
        const verifyHR = async (req, res, next) => {
            const email = req.user.email;
            const query = { email: email };
            const isHR = await userCollection.findOne(query);
            if (!isHR.role === 'hr') {
                res.status(403).send({ message: 'forbidden Access can not verify HR' })
            }
            next()
        }

        // review related APIs
        app.post('/review', async (req, res) => {
            const data = req.body;
            const result = await reviewCollection.insertOne(data);
            res.send(result)
        })

        app.get('/review', async (req, res) => {
            const result = await reviewCollection.find().toArray();
            res.send(result)
        })

        // user related APIs 


        app.post('/users', async (req, res) => {
            const data = req.body;
            const email = req.body.email;
            const query = { email: email };
            const isFired = await firedCollection.findOne(query)
            if (isFired) {
                return req.send({ message: 'user is Fired by Admin and user can not login' })
            }
            const result = await userCollection.insertOne(data);
            res.send(result)
        })

        app.get('/users', async (req, res) => {
            const result = await userCollection.find().toArray();
            res.send(result)
        })


        // admin related
        app.post('/fireds', async (req, res) => {
            const email = req.body;
            const result = await firedCollection.insertOne(email)
            res.send(result)
        })
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);






app.listen(port, (req, res) => {
    console.log(`Example app running on port ${port}`)
})