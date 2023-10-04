const express = require('express');
const app = express();
const methodOverride = require('method-override');
const bodyParser = require('body-parser');
const { Pool } = require('pg');
const {v4 : uuidv4} = require('uuid');
const session = require('express-session');
const multer = require('multer');

app.use(session({
    secret: '1234', // You should generate and keep this key secure
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // for testing purposes, set secure to false. For production, set it to true if using https.
}));


const storage = multer.memoryStorage(); // Store the image in memory
const upload = multer({ storage: storage });

// define a port where we will run the application
let port = 3000;

// path settings
const path = require("path");
// add default paths to use ejs
app.set('view engine','ejs');
app.set('views',path.join(__dirname,'/views'));

// public path
app.use(express.static(path.join(__dirname,'/public')));

// connecting to database
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'jeecode',
    password: 'Jayeshsql',
    port: 5432,
});

let user="";
// to parse the post requests
app.use(express.urlencoded({express:true}));
app.use(express.json());
app.use(bodyParser.json());

// override with post having    ?_method=PATCH
app.use(methodOverride('_method'));

// add request listener
app.listen(port,()=>{
    console.log("listening on port no. 3000");
});

// testing 
app.get("/apple",(req,res)=>{
    res.send("this is apple reqest");
});
app.get("/",(req,res)=>{
    res.render("homeBefore.ejs");
});

// student register request getting  ----> start

app.get('/studentRegister',(req,res)=>{
    res.render('studentRegister.ejs');
});

app.post('/StudentRegistered',(req,res)=>{
    const {fullname, email, username, password} = req.body;
    pool.query(`INSERT INTO StudentRegistrations (fullname,email,username,password) VALUES ('${fullname}', '${email}', '${username}', '${password}')`, (error, results) => {
        if (error) {
            throw error;
        }
        let wrong = false;
        res.status(200).render('loginStudent.ejs',{wrong});
    });
});

// student registration end <------


// teacher register request getting  ----> start

app.get('/teacherRegister',(req,res)=>{
    res.render('teacherRegister.ejs');
});

app.post('/TeacherRegistered',(req,res)=>{
    const {fullname, email,experience, gradYear, username, password} = req.body;
    console.log(`('${fullname}', '${email}',${experience},${gradYear},'${username}', '${password}')`);
    pool.query(`INSERT INTO TeacherRegistrations (fullname,email,experience,gradYear,username,password) VALUES ('${fullname}', '${email}',${experience},${gradYear}, '${username}', '${password}')`, (error, results) => {
        if (error) {
            throw error;
        }
        let wrong = false;
        res.status(200).render('loginTeacher.ejs',{wrong});
    });
});

// teacher registration end <------
 

// Student login 

app.get('/studentLogin',(req,res)=>{
    let wrong = false;
    res.render('loginStudent.ejs',{wrong});
});

app.post('/StudentLogin', async (req, res) => {
    const { username, password } = req.body;
    user = username;

    try {
        const userResult = await pool.query('SELECT fullname FROM StudentRegistrations WHERE username = $1 AND password = $2', [username, password]);

        if (userResult.rows.length === 1) {
            const name = userResult.rows[0].fullname;
            console.log(name);

            // Fetch topics with their counts
            const topicsWithCount = await pool.query(`
                SELECT topic, COUNT(*) as question_count 
                FROM questions 
                GROUP BY topic;
            `);

            const role = 'student';
            res.render('homeAfter.ejs', { username, role, topics: topicsWithCount.rows });
        } else {
            const wrong = true;
            res.render('loginStudent.ejs', { wrong });
        }

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// Route to fetch questions for a specific topic
app.get('/questions/topic/:topicName', async (req, res) => {
    const topicName = req.params.topicName;
    try {
        const queryResult = await pool.query(`
            SELECT * FROM questions WHERE topic = $1
        `, [topicName]);

        res.render('showTopicQuestion.ejs', { questions: queryResult.rows,username:user,topic:topicName});
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// app.get('/questions/:topicName', async (req, res) => {
//     const topicName = req.params.topicName;
//     let difficulty = req.query.difficulty;  // getting difficulty from query params

//     let queryString;
//     let queryParams;

//     // If a difficulty has been selected, modify the query and params to reflect that.
//     if(difficulty && ['easy', 'medium', 'hard'].includes(difficulty)){
//         queryString = `
//             SELECT * FROM questions WHERE topic = $1 AND difficulty = $2
//         `;
//         queryParams = [topicName, difficulty];
//     } else {
//         queryString = `
//             SELECT * FROM questions WHERE topic = $1
//         `;
//         queryParams = [topicName];
//     }

//     try {
//         const queryResult = await pool.query(queryString, queryParams);
//         res.render('showTopicQuestion', { questions: queryResult.rows, username: user, topic: topicName });
//     } catch (err) {
//         console.error(err.message);
//         res.status(500).send('Server error');
//     }
// });

// Teacher login 

app.get('/teacherLogin',(req,res)=>{
    let wrong = false;
    res.render('loginTeacher.ejs',{wrong});
});

app.post('/TeacherLogin',(req,res)=>{
    const {username,password} = req.body;
    pool.query('SELECT fullname FROM TeacherRegistrations WHERE username = $1 AND password = $2', [username, password], function (err, result, fields) {
        if (err) throw err;
        if(result.rows.length === 1){
            let name = result.rows[0].fullname;
            console.log(name);
            let role = 'teacher';
            res.render('homeAfter.ejs',{username,role});
        }else{
            let wrong = true;
            res.render('loginTeacher',{wrong});
        }
    });
});



// upload question

app.get('/uploadQuestion',(req,res)=>{
    res.render('uploadQuestion.ejs');
});

// abhi iski table banana bacha hai to error aayegi


app.post('/UploadQuestion', (req, res) => {
    console.log(req.body);

    const { 
        name, 
        description, 
        optionA, 
        optionB, 
        optionC, 
        optionD, 
        correctAnswer, 
        difficulty, 
        subject,
        topic,
        points 
    } = req.body;

    const queryText = `
        INSERT INTO questions 
        (name, description, optionA, optionB, optionC, optionD, correctAnswer, difficulty, subject, topic, points) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    `;

    const queryValues = [name, description, optionA, optionB, optionC, optionD, correctAnswer, difficulty, subject, topic, points];

    pool.query(queryText, queryValues, (error, results) => {
        if (error) {
            throw error;
        }
        res.status(200).send(`Question uploaded successfully! </br> Back to home <a href="http://localhost:3000">back</a>`);
    });
});



// let posts = [
//     {   
//         id : uuidv4(),
//         username : 'arvind',
//         content : 'hello i am arvind and i am from sirvaiya family'
//     },
//     {   
//         id:uuidv4(),
//         username : 'ankit',
//         content : 'hello i am ankit and i am from patel family'
//     },
//     {   
//         id:uuidv4(),
//         username : 'jayesh',
//         content : 'hello i am jayesh and i am from unde family'
//     }
// ];
app.get('/post/:id', async (req, res) => {
    const questionId = req.params.id;
    try {
        // Fetch posts related to the question
        const postsResult = await pool.query('SELECT * FROM posts WHERE questionId = $1', [questionId]);

        // Fetch the question name
        const questionResult = await pool.query('SELECT name FROM questions WHERE id = $1', [questionId]);
        
        // Extract the question name
        const questionName = questionResult.rows[0].name;

        if (postsResult.rows.length > 0) {
            res.render('post.ejs', { posts: postsResult.rows, questionId, username: user, questionName });
        } else {
            res.redirect(`/posts/${questionId}/new`);
        }
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});
app.post('/post/:id', upload.single('image'), async (req, res) => {
    try {
        // Extract information from the request body
        let { username, content } = req.body;
        let questionId = req.params.id;

        let image = null;

        // Check if image is uploaded
        if (req.file) {
            image = req.file.buffer;
        }
        // SQL query to insert data into the posts table
        const insertQuery = `
            INSERT INTO posts (questionid, username, content, image) 
            VALUES ($1, $2, $3, $4::bytea) RETURNING postid;
        `;

        // Execute the query
        const result = await pool.query(insertQuery, [questionId, username, content, image]);

        console.log(result.rows[0].username);
        console.log("Inserted post with ID:", result.rows[0].postid);

        res.redirect(`/post/${questionId}`);
    } catch (err) {
        console.error("Error inserting post:", err.message,err.stack);
        res.status(500).send('Server Error');
    }
});




app.get('/posts/:id/new',(req,res)=>{
    const questionId = req.params.id;
    res.render('new.ejs',{username:user,questionId});
});

// app.get('/posts',(req,res)=>{
//     res.render('post.ejs',{posts});
// });

app.get('/posts/:id/:qid', async (req, res) => {
    const postId = req.params.id;
    const questionId = req.params.qid;
    try {
        const postResult = await pool.query('SELECT * FROM posts WHERE postid = $1 AND questionId = $2', [postId, questionId]);

        if (postResult.rows.length > 0) {
            const post = postResult.rows[0];
            const image = post.image;
            // Fetching all related comments/replies for the main post
            const repliesResult = await pool.query('SELECT * FROM posts WHERE replyid = $1', [post.postid]);

            const replies = repliesResult.rows;
            res.render('show.ejs', { post, replies, questionId,image });
        } else {
            res.send('Post not found');
        }
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});
// Display form to reply to a post
app.get('/posts/:id/:qid/reply', (req, res) => {
    const postId = req.params.id;
    const questionId = req.params.qid;
    res.render('replyForm.ejs', { postId,questionId,username:user });
});

// Handle the form submission to save the reply
app.post('/posts/:id/:qid/reply', async (req, res) => {
    const postId = req.params.id;
    const questionId = req.params.qid;
    const { username, content } = req.body;

    try {
        await pool.query('INSERT INTO posts (username, content, questionId, replyid) VALUES ($1, $2, 0, $3)', [username, content, postId]);
        res.redirect(`/posts/${postId}/${questionId}`);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

app.get('/posts/:id/:qid/edit', async (req, res) => {
    const postId = req.params.id;
    const questionId = req.params.qid;

    try {
        const result = await pool.query('SELECT * FROM posts WHERE postid = $1 AND questionId = $2', [postId, questionId]);

        if (result.rows.length > 0) {
            const post = result.rows[0];
            res.render('edit.ejs', { post,questionId });
        } else {
            res.send('Post not found');
        }
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

app.patch('/posts/:id/:qid', async (req, res) => {
    const postId = req.params.id;
    const questionId = req.params.qid;
    const newContent = req.body.content;

    try {
        await pool.query('UPDATE posts SET content = $1 WHERE postid = $2 ', [newContent, postId]);
        res.redirect(`/post/${questionId}`);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});


app.delete('/posts/:id/:qid', async (req, res) => {
    const postid = req.params.id;
    const questionId = req.params.qid;

    try {
        await pool.query('DELETE FROM posts WHERE postid = $1 AND questionId = $2', [postid, questionId]);
        res.redirect(`/post/${questionId}`);
    } catch (err) {
        console.error("SQL error:", err);
        res.status(500).send('Server Error');
    }
});

app.get('/loginChoice',(req,res)=>{
    let wrong = false;
    res.render('loginChoice.ejs',{wrong});
})

app.post('/loginAs',(req,res)=>{
    const {role} = req.body;
    console.log(role);
    let wrong = false;
    if(role == 'student'){
        res.render('loginStudent.ejs',{wrong});
    }else if(role=='teacher'){
        res.render('loginTeacher.ejs',{wrong});
    }else{
        wrong = true;
        res.render('loginChoice.ejs',{wrong});
    }
});

app.get('/subjectSelection',(req,res)=>{
    res.render('subjectSelection.ejs');
});

// app.get('/questions/:subject', async (req, res) => {
//     const subject = req.params.subject;
//     try {
//         const result = await pool.query('SELECT id,name,difficulty FROM questions WHERE subject = $1', [subject]);
//         res.render('showAllQuestions.ejs',{result,subject});
//     } catch (err) {
//         res.status(500).send('Error fetching questions.');
//     }
// });

app.get('/practicePage/:id',async(req,res)=>{
    let {id} = req.params;
    console.log(req.params);
    try {
        const result = await pool.query('SELECT * FROM questions WHERE id = $1', [id]);
        const question = result.rows[0];
        // console.log(question);
        // console.log(question.name);
        // console.log(question.optiona);
        res.render('practicePage.ejs',{question,username:user});
    } catch (err) {
        res.status(500).send('Error fetching question with id');
    }
});

app.get('/questions/:subject', async (req, res) => {
    const subject = req.params.subject;
    const searchTerm = req.query.search || '';
    const difficulty = req.query.difficulty || '';

    try {
        let query = "SELECT * FROM questions WHERE subject = $1";
        let queryParams = [subject];
        
        if (searchTerm) {
            query += ` AND name ILIKE $2`;
            queryParams.push(`%${searchTerm}%`);
        }
        if (difficulty) {
            if (searchTerm) { // If we've added a searchTerm, the index for the difficulty placeholder would be $3
                query += ` AND difficulty = $3`;
            } else {
                query += ` AND difficulty = $2`;
            }
            queryParams.push(difficulty);
        }


        console.log(query);
        console.log(queryParams);

        const result = await pool.query(query, queryParams);

        res.render('showAllQuestions.ejs', { result, subject, username: user });
    } catch (err) {
        res.status(500).send('Error fetching questions.');
    }
});
app.post("/insertSolvedData", async (req, res) => {
    try {
        const { username, questionId, timespent, date, doneStatus, subject } = req.body;
        await pool.query(`INSERT INTO solved (username, questionId, timespent, date, doneStatus) VALUES ($1, $2, $3, $4, $5)`, [username, questionId, timespent, date, doneStatus]);
        res.redirect(`/questions/${subject}`);
    } catch (err) {
        console.error("Failed to insert data", err);
        res.status(500).send('Failed to insert data');
    }
});
app.get('/contactus',(req,res)=>{
    res.render('contactus.ejs');
});

// User Profile
app.get("/user/:role/:username",(req,res)=>{
    let {role,username} = req.params;
    console.log(username);
    console.log(role);
    pool.query('SELECT * FROM questions', function (err, result, fields) {
        if (err) throw err;
        rows = result.rows;
        pool.query('SELECT * FROM solved WHERE username = $1', [username], function (err, result2, fields) {
            if (err) throw err;
            solvedResult = result2.rows;
            pool.query('select * from studentregistrations where username = $1',[username],function(err2,result3, fields){
                if (err2) throw err2;
                let user = result3.rows[0];
                res.render('profile.ejs',{role,username,rows,solvedResult,user});
            })
            
        });
        // res.render('profile.ejs',{role,username,rows});
    });

});


// Building Contest feature

app.get('/contest', async (req, res) => {
    try {
        const username = user;  // Assuming you've a way to get the logged-in user's username

        // Fetch all tests
        const testResults = await pool.query('SELECT * FROM test');
        
        // For each test, check if the user has an entry in the 'attempts' table
        const testsTaken = {};
        for (let test of testResults.rows) {
            const attemptResult = await pool.query('SELECT * FROM attempts WHERE username = $1 AND testId = $2', [username, test.testid]);
            testsTaken[test.testid] = (attemptResult.rows.length > 0);
        }

        res.render('contest.ejs', { tests: testResults.rows, testsTaken: testsTaken,username });
    } catch (err) {
        console.error("Error rendering contests:", err);
        res.status(500).send('Server Error');
    }
});


// testInstruction
app.get('/testInstructions/:testId', async (req, res) => {
    try {
        const testId = req.params.testId;
        const testDetails = await pool.query('SELECT * FROM test WHERE testId = $1', [testId]);
        if (testDetails.rows.length > 0) {
            res.render('testInstructions.ejs', { test: testDetails.rows[0] });
        } else {
            res.send('Test not found');
        }
    } catch (err) {
        console.error("Error fetching test details:", err);
        res.status(500).send('Server Error');
    }
});
app.get('/startTest/:testId', async (req, res) => { 
    try {
        const testId = req.params.testId;
        const testDetails = await pool.query('SELECT * FROM test WHERE testId = $1', [testId]);
        
        // Fetch all questions for the test
        const questionDetails = await pool.query('SELECT * FROM testQuestions WHERE testId = $1', [testId]);

        if (questionDetails.rows.length > 0) {
            res.render('testPage.ejs', { 
                question: questionDetails.rows,
                test: testDetails.rows[0] 
            });
        } else {
            res.send('Test not found or no questions available for this test.');
        }
    } catch (err) {
        console.error("Error fetching questions:", err);
        res.status(500).send('Server Error');
    }
});


// app.post('/submitTest', async (req, res) => {
//     console.log(user);
//     try {
        // let score = 0;
        // let correctCount = 0;
        // let wrongCount = 0;
        // let unattemptedCount = 0;
        // const timeSpent = req.body.timeSpent;
        // const username = user;
        
        // // Fetch the correct answers for the test
        // const correctAnswers = await pool.query('SELECT questionId, correctAnswer FROM testQuestions WHERE testId = $1', [req.body.testId]);

        // correctAnswers.rows.forEach(row => {
        //     if(req.body['option' + row.questionid] === row.correctanswer) {
        //         score += 4; // or whatever your marking scheme is
        //         correctCount++;
        //     } else if(req.body['option' + row.questionId]) { // answered but wrong
        //         score -= 1;
        //         wrongCount++;
        //     } else {
        //         unattemptedCount++;
        //     }
        // });

//         // Now insert into the attempts table
//         await pool.query('INSERT INTO attempts (testId, username, score, correctQuestion, wrongQuestion, unattempted, timeSpent) VALUES ($1, $2, $3, $4, $5, $6, $7)', [req.body.testId,username, score, correctCount, wrongCount, unattemptedCount, timeSpent]);

//         res.redirect(`/testResult/${user}/${req.body.testId}`); // Redirect to wherever you wish to show the result
//     } catch(err) {
//         console.error(err);
//         res.status(500).send('Internal Server Error');
//     }
// });

// // Assuming you're using Express and have a way of querying your database:
app.get('/testResult/:username/:testId', async (req, res) => {
    try {
        const username = req.params.username;
        const testId = req.params.testId;

        // Fetch the result for this user and this test from the 'attempts' table.
        const result = await pool.query('SELECT * FROM attempts WHERE username = $1 AND testId = $2', [username, testId]);

        if (result.rows.length > 0) {
            res.render('resultPage.ejs', { testResult: result.rows[0] });
        } else {
            res.send('No results found for this test.');
        }
    } catch (err) {
        console.error("Error fetching test results:", err);
        res.status(500).send('Server Error');
    }
});


app.post('/submitTest', async (req, res) => {
    try {
        console.log("Received form data:", req.body);
        let score = 0;
        let correctCount = 0;
        let wrongCount = 0;
        let unattemptedCount = 0;
        const timeSpent = req.body.timeSpent;
        const username = user;
        
        // Fetch the correct answers for the test
        const correctAnswers = await pool.query('SELECT questionId, correctAnswer FROM testQuestions WHERE testId = $1', [req.body.testId]);

        correctAnswers.rows.forEach(row => {
            console.log(`Checking for questionId: ${row.questionid}. Submitted: ${req.body['option' + row.questionid]}, Correct: ${row.correctanswer}`); 
            if(req.body['option' + row.questionid] === row.correctanswer) { // note the change to lowercase property names
                score += 4;
                correctCount++;
            } else if(req.body['option' + row.questionid] && req.body['option' + row.questionid] !== row.correctanswer) { // answered but wrong
                score -= 1;
                wrongCount++;
            } else {
                unattemptedCount++;
            }
        });
        
        const currentDate = new Date().toISOString().slice(0, 10); // Getting the current date in 'YYYY-MM-DD' format

        // Now insert into the attempts table
        await pool.query('INSERT INTO attempts (testId, username, score, correctQuestion, wrongQuestion, unattempted, timeSpent, date) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)', [req.body.testId, username, score, correctCount, wrongCount, unattemptedCount, timeSpent, currentDate]);

        res.redirect(`/testResult/${user}/${req.body.testId}`);
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
});