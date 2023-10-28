// setup
const express = require('express');
const app = express();
const methodOverride = require('method-override');
const bodyParser = require('body-parser');
const { Pool } = require('pg');
const {v4 : uuidv4} = require('uuid');
const session = require('express-session');
const multer = require('multer');

app.use(session({
    secret: 'Jayeshsql', // You should generate and keep this key secure
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

app.get("/",(req,res)=>{
    res.render("homeBefore.ejs");
});

// #######################################################################################
// Registration

app.get('/studentRegister',(req,res)=>{
    res.render('studentRegister.ejs');
});

app.post('/StudentRegistered', (req, res) => {
    const { fullname, email, username, password } = req.body;

    // Begin a transaction
    pool.query('BEGIN', (err) => {
        if(err) throw err;

        // First, insert into the StudentRegistrations table
        pool.query(`INSERT INTO StudentRegistrations (fullname,email,username,password) VALUES ($1, $2, $3, $4) RETURNING *`, [fullname, email, username, password], (error, results) => {
            if (error) {
                // If there's an error, rollback the transaction
                return pool.query('ROLLBACK', (rollbackErr) => {
                    if(rollbackErr) throw rollbackErr;
                    throw error;
                });
            }

            // Now, insert into the users table
            pool.query(`INSERT INTO users (username) VALUES ($1) RETURNING *`, [username], (error2, results2) => {
                if (error2) {
                    // If there's an error, rollback the transaction
                    return pool.query('ROLLBACK', (rollbackErr) => {
                        if(rollbackErr) throw rollbackErr;
                        throw error2;
                    });
                }

                // If both inserts were successful, commit the transaction
                pool.query('COMMIT', (commitErr) => {
                    if(commitErr) throw commitErr;
                    let wrong = false;
                    res.status(200).render('loginStudent.ejs', {wrong});
                });
            });
        });
    });
});


app.get('/teacherRegister',(req,res)=>{
    res.render('teacherRegister.ejs');
});

app.post('/TeacherRegistered', (req, res) => {
    const { fullname, email, experience, gradYear, username, password } = req.body;

    // Begin a transaction
    pool.query('BEGIN', (err) => {
        if (err) throw err;

        // First, insert into the TeacherRegistrations table
        pool.query(`INSERT INTO TeacherRegistrations (fullname, email, experience, gradYear, username, password) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`, 
        [fullname, email, experience, gradYear, username, password], (error, results) => {
            if (error) {
                // If there's an error, rollback the transaction
                return pool.query('ROLLBACK', (rollbackErr) => {
                    if (rollbackErr) throw rollbackErr;
                    throw error;
                });
            }

            // Now, insert the username into the users table
            pool.query(`INSERT INTO users (username) VALUES ($1) RETURNING *`, [username], (error2, results2) => {
                if (error2) {
                    // If there's an error, rollback the transaction
                    return pool.query('ROLLBACK', (rollbackErr) => {
                        if (rollbackErr) throw rollbackErr;
                        throw error2;
                    });
                }

                // If both inserts were successful, commit the transaction
                pool.query('COMMIT', (commitErr) => {
                    if (commitErr) throw commitErr;
                    let wrong = false;
                    res.status(200).render('loginTeacher.ejs', {wrong});
                });
            });
        });
    });
});

// ############################################################################################# 
// Login

app.get('/studentLogin',(req,res)=>{
    let wrong = false;
    res.render('loginStudent.ejs',{wrong});
});

app.post('/StudentLogin', async (req, res) => {
    const { username, password } = req.body;
    user = username;
    req.session.username = username;
    req.session.role = 'student';
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

            res.render('homeAfter.ejs', { username, role:req.session.role, topics: topicsWithCount.rows });
        } else {
            const wrong = true;
            res.render('loginStudent.ejs', { wrong });
        }

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});
app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/'); // or wherever you want to redirect after logout
  });
  
// Route to fetch questions for a specific topic
app.get('/questions/topic/:topicName', async (req, res) => {
    const topicName = req.params.topicName;
    const role = req.query.role;
    const difficulty = req.query.difficulty;

    let query = `SELECT * FROM questions WHERE topic = $1`;
    let queryParams = [topicName];

    if (difficulty) {
        query += ` AND difficulty = $2`;
        queryParams.push(difficulty);
    }

    try {
        console.log(query);
        console.log(queryParams);

        const result = await pool.query(query, queryParams);
        res.render('showTopicQuestion.ejs', { questions: result.rows, username: user, topic: topicName, role });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// Teacher login 

app.get('/teacherLogin',(req,res)=>{
    let wrong = false;
    res.render('loginTeacher.ejs',{wrong});
});

app.post('/TeacherLogin',(req,res)=>{
    const {username,password} = req.body;
    req.session.username = username;
    req.session.role = 'teacher';
    pool.query('SELECT fullname FROM TeacherRegistrations WHERE username = $1 AND password = $2', [username, password], function (err, result, fields) {
        if (err) throw err;
        if(result.rows.length === 1){
            let name = result.rows[0].fullname;
            console.log(name);
            res.render('homeAfter.ejs',{username,role:req.session.role});
        }else{
            let wrong = true;
            res.render('loginTeacher',{wrong});
        }
    });
});

// Login choice

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

// ############################################################################################################


// upload question

app.get('/uploadQuestion',(req,res)=>{
    res.render('uploadQuestion.ejs');
});

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
        RETURNING id
    `;

    const queryValues = [name, description, optionA, optionB, optionC, optionD, correctAnswer, difficulty, subject, topic, points];

    pool.query(queryText, queryValues, (error, results) => {
        if (error) {
            throw error;
        }

        // Check if any rows were returned, and then extract the id
        if (results.rows.length > 0) {
            const questionId = results.rows[0].id; 

            // const loggedInUsername = req.session.username; // Assuming you're storing the logged in user's name in a session

            const uploadQuery = `
                INSERT INTO uploaded 
                (qid, author, dateuploaded) 
                VALUES ($1, $2, CURRENT_DATE)
            `;

            pool.query(uploadQuery, [questionId,req.session.username], (err, result) => {
                if (err) {
                    throw err;
                }
                res.status(200).send(`Question uploaded successfully! </br> Back to home <a href="http://localhost:3000">back</a>`);
            });
        } else {
            res.status(400).send(`Error: Could not retrieve the inserted question's ID.`);
        }
    });
});



// #######################################################################################################################################
// Discussion Forum

// Fetch all the Posts of that particular question

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

// Create post

app.get('/posts/:id/new',(req,res)=>{
    const questionId = req.params.id;
    res.render('new.ejs',{username:user,questionId});
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

// show detailed posts with replies

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

// Edit post page

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

// Edited post submission

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

// delete post

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

// #############################################################################################################################
// Question Practice Page 

// Subject wise Question Page

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
        
        res.render('showAllQuestions.ejs', { result, subject, username: req.session.username,role:req.session.role });
    } catch (err) {
        res.status(500).send('Error fetching questions.');
    }
});

// practice page

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

// solved question data inserted to solved database 

app.post("/insertSolvedData", async (req, res) => {
    try {
        const { username, questionId, timespent, date, doneStatus, subject } = req.body;
        await pool.query(`INSERT INTO solved (username, questionId, timespent, date, doneStatus)
         VALUES ($1, $2, $3, $4, $5)`, [username, questionId, timespent, date, doneStatus]);
        res.redirect(`/questions/${subject}`);
    } catch (err) {
        console.error("Failed to insert data", err);
        res.status(500).send('Failed to insert data');
    }
});

// ####################################################################################################################################################################################

app.get('/contactus',(req,res)=>{
    res.render('contactus.ejs');
});

// ####################################################################################################################################################################################

// User Profile

app.get("/user/:role/:username",(req,res)=>{
    let {role,username} = req.params;
    console.log(username);
    console.log(role);
    pool.query('SELECT * FROM questions', function (err, result, fields) {
        if (err) throw err;
        rows = result.rows;
        if(role === 'student'){
            pool.query('SELECT * FROM solved WHERE username = $1', [username], function (err, result2, fields) {
                if (err) throw err;
                solvedResult = result2.rows;
                pool.query('select * from studentregistrations where username = $1',[username],function(err2,result3, fields){
                    if (err2) throw err2;
                    let user = result3.rows[0];
                    pool.query('select * from users where username = $1',[username],(err3,result4)=>{
                        if(err3) throw err3;
                        let details = result4.rows[0];
                        
                        res.render('profile.ejs',{role,username,rows,solvedResult,user,details});
                    });
                    

                });
                
            });
        }else if(role === 'teacher'){
            pool.query('select * from teacherregistrations where username = $1',[username],(err11,result11)=>{
                if(err11){
                    throw err11;
                }
                let user = result11.rows[0];
                pool.query('select * from users where username = $1',[username],(err12,result12)=>{
                    if(err12){
                        throw err12;
                    }
                    let details = result12.rows[0];
                    pool.query('SELECT * FROM uploaded WHERE author = $1 ORDER BY dateUploaded ASC', [username], (err13, result13) => {
                        if (err13) {
                            throw err13;
                        }
                        // Rest of your code
                        let uploads = result13.rows;

                        console.log(rows);
                        res.render('teacher_profile.ejs',{role,username,user,details,rows,uploads});
                    });
                });
            });
           
        }
        
        // res.render('profile.ejs',{role,username,rows});
    });

});

// Edit Profile

app.get('/edit/:role/:username',(req,res)=>{
    let {role,username} = req.params;
    let q = 'select * from users where username = $1';
    pool.query(q,[username],(err,result)=>{
        if(err) throw err;
        let details = result.rows[0];
        console.log(details);
        res.render('profile_edit.ejs',{details,role,username});
    });
    
});

// post edit profile data to users table

app.post("/edit_profile", (req, res) => {
    let { username, role, school, age, country, address, exam, mobile, website, twitter, github, instagram, linkedin } = req.body;
    username = req.session.username;
    let q = `UPDATE users SET role = $1`;
    let queryParams = [role];

    if (school) {
        q += `, school = $${queryParams.length + 1}`;
        queryParams.push(school);
    }
    if (age) {
        q += `, age = $${queryParams.length + 1}`;
        queryParams.push(age);
    }
    if (country) {
        q += `, country = $${queryParams.length + 1}`;
        queryParams.push(country);
    }
    if (address) {
        q += `, address = $${queryParams.length + 1}`;
        queryParams.push(address);
    }
    if (exam) {
        q += `, exam = $${queryParams.length + 1}`;
        queryParams.push(exam);
    }
    if (mobile) {
        q += `, mobile = $${queryParams.length + 1}`;
        queryParams.push(mobile);
    }
    if (website) {
        q += `, website = $${queryParams.length + 1}`;
        queryParams.push(website);
    }
    if (twitter) {
        q += `, twitter = $${queryParams.length + 1}`;
        queryParams.push(twitter);
    }
    if (instagram) {
        q += `, instagram = $${queryParams.length + 1}`;
        queryParams.push(instagram);
    }
    if (github) {
        q += `, github = $${queryParams.length + 1}`;
        queryParams.push(github);
    }
    if (linkedin) {
        q += `, linkedin = $${queryParams.length + 1}`;
        queryParams.push(linkedin);
    }

    q += ` WHERE username = $${queryParams.length + 1}`;
    queryParams.push(username);

    pool.query(q, queryParams, (err, result) => {
        if (err) throw err;
        res.redirect(`/user/${role}/${username}`);
    });
});


// ####################################################################################################################################################################################

// Building Contest feature
// Contest page

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

// test question page

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

// Result page of test
app.get('/testResult/:username/:testId', async (req, res) => {
    try {
        const username = req.params.username;
        const testId = req.params.testId;

        // Fetch the result for this user and this test from the 'attempts' table.
        const result = await pool.query('SELECT * FROM attempts WHERE username = $1 AND testId = $2', [username, testId]);

        if (result.rows.length > 0) {
            const n = req.session.visitedCount || 0;
            console.log(`the result is:${n}`); // Assuming you have body-parser or express.json() middleware set up
            res.render('resultPage.ejs', { testResult: result.rows[0], n: n });
            delete req.session.visitedcount;
        } else {
            res.send('No results found for this test.');
        }
    } catch (err) {
        console.error("Error fetching test results:", err);
        res.status(500).send('Server Error');
    }
});



// submit test

app.post('/submitTest', async (req, res) => {
    
    try {
        console.log("Received form data:", req.body);
        let score = 0;
        let correctCount = 0;
        let wrongCount = 0;
        let unattemptedCount = 0;
        const timeSpent = req.body.timeSpent;
        const username = req.session.username;
        
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
        req.session.visitedCount = req.body.visitedCount;
        console.log(`the result is:${req.session.visitedCount}`);
        res.redirect(`/testResult/${username}/${req.body.testId}`);
    } catch (err) {
        console.error(err);
        console.log(`username for following request is:${user}`);
        res.status(500).send('Internal Server Error');
    }
});

// leaderboard

app.get('/leaderboard/:testId', async (req, res) => {
    try {
        const testId = req.params.testId;
        
        const leaderboardResults = await pool.query(`
            SELECT 
                username, 
                score, 
                correctquestion, 
                wrongquestion,
                RANK() OVER (ORDER BY score DESC, wrongquestion ASC) AS rank
            FROM 
                attempts 
            WHERE 
                testid = $1
            ORDER BY 
                score DESC, wrongquestion ASC;
        `, [testId]);

        res.render('leaderboard.ejs', { leaderboard: leaderboardResults.rows });
    } catch (err) {
        console.error("Error fetching leaderboard:", err);
        res.status(500).send('Server Error');
    }
});

// ####################################################################################################################################################################################
