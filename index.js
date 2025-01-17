const express = require('express')
const cors = require('cors')
require('dotenv').config();
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
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
        const workCollection = client.db('employee').collection('works')
        const payroleCollection = client.db('employee').collection('payroles')



        //  token Related APIs
        app.post('/jwt', async (req, res) => {
            const data = req.body;
            const token = jwt.sign(data, process.env.ACCESS_TOKEN_SECURE, {
                expiresIn: '10h'
            })
            // console.log(token)
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

        app.get('/employee-list', async (req, res) => {
            const query = { role: 'Employee' }
            const data = await userCollection.find(query).toArray();
            res.send(data)

        })


        // Employee related APIs

        app.post('/work-sheet', async (req, res) => {
            const data = req.body;
            const result = await workCollection.insertOne(data);
            res.send(result)

        });

        app.get('/work-sheet/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email }
            const result = await workCollection.find(query).sort({ date: -1 }).toArray();
            res.send(result)
        })
        app.patch('/work-sheet/:id', async (req, res) => {
            const { _id, ...data } = req.body;
            const id = req.params.id;
            // console.log("data", data, "id is", id)
            const query = { _id: new ObjectId(id) }
            const updateDoc = { $set: data }
            const result = await workCollection.updateOne(query, updateDoc);
            res.send(result)
        })

        app.delete('/work-sheet/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await workCollection.deleteOne(query);
            res.send(result)
        })

        // hr related api 


        // for payment btn
        app.post('/payrole', async (req, res) => {
            const { month, year, email, ...data } = req.body;
            const existingPayment = await payroleCollection.findOne({
                email,
                month,
                year,
            });

            if (existingPayment) {
                return res.status(400).send({
                    message: `Payment for ${month}/${year} has already been made for this employee.`,
                });
            }
            const paymentData = {
                month,
                year,
                email,
                paymentDate: new Date(),
                ...data,
            };
            const result = await payroleCollection.insertOne(paymentData)

            res.send(result)

        })

        //  for progress 
        app.get('/work-sheet', async (req, res) => {
            const result = await workCollection.find().toArray()
            res.send(result)
        })

        //for specific user email 
        app.get('/details/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email }
            const result = await userCollection.findOne(query);
            res.send(result)

        })

        //  for user verified 
        app.patch('/users/employees/:id', async (req, res) => {
            const id = req.params.id;
            console.log(id)
            const query = { _id: new ObjectId(id) }
            const { isVerified } = req.body;
            const updateDoc = {
                $set: { isVerified }
            }
            const result = await userCollection.updateOne(query, updateDoc)
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