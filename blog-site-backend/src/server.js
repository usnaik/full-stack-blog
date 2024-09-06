import fs from 'fs';
import path from 'path';
import admin from 'firebase-admin';
import express from 'express';
import 'dotenv/config';
import {db, connectToDb} from './db.js';

//  For deployment Static Build file 
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Setup firebase-admin credentials using "credentials.js" service account create in FBase. 
// This way we can access fireBase users data, when needed for validations at various places.
const credentials = JSON.parse(
    fs.readFileSync('./credentials.json')
);
admin.initializeApp({
    credential: admin.credential.cert(credentials),
});

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, '../build')));

app.get(/^(?!\/api).+/, (req,resp)=> {
    resp.sendFile(path.join(__dirname, '../build/index.html'));
});

// Middleware to auto-load users info from F-Base, when we receive any user requests.
app.use( async (req, resp, next) => {
    const {authtoken} = req.headers;

    if (authtoken) {
        try {
            req.user = await admin.auth().verifyIdToken(authtoken);
        } catch (e) {
            return resp.sendStatus(400);
        }
    }
    req.user = req.user || {};
    next();
})
   
app.get('/api/articles/:name/', async (req, resp) => { 
    const { name } = req.params;
    const { uid } = req.user;

    const article = await db.collection('articles').findOne({name});

    if (article) {
        const upvoteIds = article.upvoteIds || [];
        article.canUpvote = uid && !upvoteIds.includes(uid);
        resp.json(article);
    } else {
        // Resource not found
        resp.sendStatus(404);
    }
});

// Middeleware to check is user is already loggedin, if yes, allow access the routes
// This rule applies to only the below two routes i.e.  /upvote and /comment routes
app.use((req, resp, next) => {
    if (req.user) {
        next();
    } else {
        // Cannot access resource, user lacks valid authentication
        resp.sendStatus(401);
    }
});

app.put('/api/articles/:name/upvote', async (req, resp) => {
    const {name} = req.params;
    const {uid} = req.user;
    
    const article = await db.collection('articles').findOne({name});

    if (article) {
        const upvoteIds = article.upvoteIds || [];
        const canUpvote = uid && !upvoteIds.includes(uid);

        if (canUpvote) {
            // await db.collection('articles').updateOne({name}, {$set: {upvotes: 0}});        
            await db.collection('articles').updateOne({name}, {
                $inc: {upvotes: 1},
                $push: { upvoteIds: uid}
            });
        }

        const updatedArticle = await db.collection('articles').findOne({name});
        resp.json(updatedArticle);
    } else {
        resp.send(`The ${name} article doesn\'t exist!`)
    }
});

app.post('/api/articles/:name/comments', async (req, resp) => {
    const {name} = req.params;
    const {text} = req.body;
    const {email} = req.user;

    // await db.collection('articles').updateOne({name}, {$set: {comments: []}});
    await db.collection('articles').updateOne({name}, {
        $push: {comments: {postedBy:email, text} }
    });

    const article = await db.collection('articles').findOne({name});
    
    if (article) {
        resp.json(article);
    } else {
        resp.send(`The ${name} article doesn\'t exist!`)
    }
});

const PORT = process.env.PORT || 8005;

connectToDb(()=> {
    console.log("Connected to database successfully!");
    app.listen(PORT, () => {
        console.log("Server is listening on port " + PORT);
    });
})