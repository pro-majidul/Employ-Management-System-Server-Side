const express = require('express')
const cors = require('cors')
require('dotenv').config();
const jwt = require('jsonwebtoken');
const stripe = require('stripe')(process.env.Payment_Secure_key);
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

        // verify Employee

        const VerifyEmployee = async (req, res, next) => {
            const email = req.user.email;
            const query = { email: email };
            const isEmployee = await userCollection.findOne(query);
            if (!isEmployee.role === 'Employee') {
                res.status(403).send({ message: 'forbidden Access can not verify Employee' })
            }
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
            const { role, ...data } = req.body;
            let info = {}
            if (role === 'HR') {
                info = { isVerified: true, role, ...data }
            }
            const result = await userCollection.insertOne(info);
            res.send(result)
        })

        app.put('/users', async (req, res) => {
            const { email, ...data } = req.body;
            const query = { email: email };
            // const filter = { email: email, isFired: true }
            const filter = { email: email, isFired: true };
            const isFired = await userCollection.findOne(filter)
            if (isFired) {
                return res.status(404).send({ message: 'user is Fired by Admin and user can not login' })
            }
            const isEmail = await userCollection.findOne(query);
            if (isEmail) {
                return res.status(200).send({ message: 'user already added in DB , couldnot create balance' })
            }
            const option = { upsert: true }
            const updateDoc = {
                $set: { email, ...data, loginTime: new Date() }
            }
            const result = await userCollection.updateOne(query, updateDoc, option)
            res.send(result)

        })

        app.patch('/isFired', Verification, async (req, res) => {
            const email = req.body.email;
            const filter = { email: email, isFired: true };
            const isFired = await userCollection.findOne(filter)
            if (isFired) {
                return res.status(404).send({ message: 'user is Fired by Admin and user can not login' })
            }
            const query = { email: email }
            const updateDoc = { $set: { loginTime: new Date() } }
            const options = { upsert: true };
            const result = await userCollection.updateOne(query, updateDoc, options);
            res.send(result)
        })



        app.get('/users', async (req, res) => {
            const result = await userCollection.find().toArray();
            res.send(result)
        })

        app.get('/employee-list',Verification, verifyHR, async (req, res) => {
            const query = { role: 'Employee' }
            const data = await userCollection.find(query).toArray();
            res.send(data)

        })


        // Employee related APIs

        app.post('/work-sheet', Verification,VerifyEmployee, async (req, res) => {
            const data = req.body;
            const result = await workCollection.insertOne(data);
            res.send(result)

        });

        app.get('/work-sheet/:email', Verification,VerifyEmployee, async (req, res) => {
            const email = req.params.email;
            const query = { email: email }
            const result = await workCollection.find(query).sort({ date: -1 }).toArray();
            res.send(result)
        })
        app.patch('/work-sheet/:id', Verification,VerifyEmployee, async (req, res) => {
            const { _id, ...data } = req.body;
            const id = req.params.id;
            // console.log("data", data, "id is", id)
            const query = { _id: new ObjectId(id) }
            const updateDoc = { $set: data }
            const result = await workCollection.updateOne(query, updateDoc);
            res.send(result)
        })

        app.delete('/work-sheet/:id', Verification, VerifyEmployee, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await workCollection.deleteOne(query);
            res.send(result)
        })


        // for paymentHistory
        app.get('/payment-history/:email', Verification, VerifyEmployee, async (req, res) => {
            const email = req.params.email;
            const { page = 1, limit = 5 } = req.query;
            const query = { email: email, isPayment: true }
            const result = await payroleCollection.find(query).sort({ month: 1, year: 1 }).skip((page - 1) * limit).limit(parseInt(limit)).toArray()
            const total = await payroleCollection.countDocuments({ email })
            res.send({
                result,
                pagination: {
                    total,
                    page: parseInt(page),
                    pages: Math.ceil(total / limit),
                },
            })
        },)

        // hr related api 


        // for payment btn
        app.post('/payrole', Verification,verifyHR, async (req, res) => {
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
                ...data,
            };
            const result = await payroleCollection.insertOne(paymentData)

            res.send(result)

        })

        app.get('/payrole', Verification,verifyAdmin, async (req, res) => {
            const page = parseInt(req.query.page) || 0;
            const limit = parseInt(req.query.limit) || 10;
            const startIndex = page * limit;
            const payroleData = await payroleCollection.find()
                .skip(startIndex)
                .limit(limit)
                .toArray();
            const totalCount = await payroleCollection.estimatedDocumentCount()
            const totalPages = Math.ceil(totalCount / limit);
            res.send({
                data: payroleData,
                totalPages,

            })
        })

        //  for progress 
        app.get('/work-sheet', Verification,verifyHR, async (req, res) => {
            const { name, month } = req.query;
            const query = {};
            if (name) {
                query.name = name;
            }
            if (month) {
                const [monthName, year] = month.split(' '); // Split "January 2025" into ["January", "2025"]
                const monthIndex = new Date(`${monthName} 1, ${year}`).getMonth(); // Get the 0-based month index
                const startDate = new Date(year, monthIndex, 1); // First day of the month
                const endDate = new Date(year, monthIndex + 1, 1); // First day of the next month

                // Query for the date range
                query.date = {
                    $gte: startDate.toISOString(), // Match dates greater than or equal to startDate
                    $lt: endDate.toISOString(), // Match dates less than endDate
                };
            }
            const result = await workCollection.find(query).toArray();
            res.send(result)
        })

        //for specific user email 
        app.get('/details/:email', Verification,verifyHR, async (req, res) => {
            const email = req.params.email;


            const result = await userCollection.aggregate([
                {
                    $match: { email: email } // Filter user by email
                },
                {
                    $lookup: {
                        from: 'payroles',
                        localField: 'email',
                        foreignField: 'email',
                        as: 'paymentHistory'
                    }
                },
                {
                    $unwind: {
                        path: '$paymentHistory',
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $group: {
                        _id: '$email',
                        name: { $first: '$name' },
                        designation: { $first: '$designation' },
                        image: { $first: '$image' },
                        salaries: { $push: '$paymentHistory.salary' },
                        months: { $push: '$paymentHistory.month' },
                        years: { $push: '$paymentHistory.year' }
                    }
                }
            ]).toArray();

            res.send(result[0]);

        });


        //  for user verified 
        app.patch('/users/employees/:id', Verification,verifyHR, async (req, res) => {
            const id = req.params.id;
            // console.log(id)
            const query = { _id: new ObjectId(id) }
            const { isVerified } = req.body;
            const updateDoc = {
                $set: { isVerified }
            }
            const result = await userCollection.updateOne(query, updateDoc)
            res.send(result)
        })


        // admin related
        app.post('/fireds', Verification, async (req, res) => {
            const email = req.body;
            const result = await firedCollection.insertOne(email)
            res.send(result)
        })

        //all verifiesd employe with hr
        app.get('/all-employee-list', Verification,verifyAdmin, async (req, res) => {
            const employee = await userCollection.find({ isVerified: true, }).toArray();
            res.send(employee)
        })

        ///make hr

        app.patch('/admin/make-hr/:id', Verification,verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const updateDoc = {
                $set: { role: 'HR' }
            };
            const result = await userCollection.updateOne(query, updateDoc);
            res.send(result)
        })
        //fired user

        app.patch('/admin/fire/:id', Verification,verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const options = { upsert: true };
            const updateDoc = {
                $set: {
                    isFired: true
                }
            }
            const result = await userCollection.updateOne(query, updateDoc, options);
            res.send(result)
        })
        //for update salarey
        app.patch('/admin/update-salary/:id', Verification,verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const { newSalary } = req.body;
            const query = { _id: new ObjectId(id) };
            const updateDoc = {
                $set: { salary: parseInt(newSalary) }

            }
            const result = await userCollection.updateOne(query, updateDoc);
            res.send(result)
        })

        // payment Intern APIs


        app.post('/create-payment-intent', async (req, res) => {
            const { price } = req.body;
            const amount = parseInt(price * 100);

            const paymentIntent = await stripe.paymentIntents.create({
                amount,
                currency: 'usd',
                payment_method_types: ['card'],


            })
            res.send({
                ClientSecret: paymentIntent.client_secret
            })
        })


        // update payrole data after pay 
        app.patch('/payrole', Verification, verifyAdmin , async (req, res) => {
            const { id, isPayment, salary, ...data } = req.body;
            const query = { _id: new ObjectId(id) }
            const updateDoc = {
                $set: { data, salary, isPayment, }
            }
            const result = await payroleCollection.updateOne(query, updateDoc);
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