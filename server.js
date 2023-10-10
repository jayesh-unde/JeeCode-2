const express = require('express');
const app = express();
const methodOverride = require('method-override');
const bodyParser = require('body-parser');
const { Pool } = require('pg');
const {v4 : uuidv4} = require('uuid');
const session = require('express-session');

app.use(session({
    secret: '1234', // You should generate and keep this key secure
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // for testing purposes, set secure to false. For production, set it to true if using https.
}));




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
app.get('/edit/:role/:username',(req,res)=>{
    let {role,username} = req.params;
    let q = 'select * from users where username = $1';
    pool.query(q,[username],(err,result)=>{
        if(err) throw err;
        let details = result.rows[0];
        console.log(details);
        res.render('profile_edit.ejs',{details});
    });
    
});

app.post("/edit_profile",(req,res)=>{
   let { username,role,school,age,country,address,exam,mobile,website,twitter,github,instagram, linkedin } = req.body;
   let q = `UPDATE users SET role = '${role}'`;
   if(school){
    q += `,school='${school}'`;
   }
   if(age){
    q += `,age=${age}`;
   }
   if(country){
    q += `,country= '${country}'`;
   }
   if(address){
    q += `,address='${address}'`;
   }
   if(exam){
    q += `,exam='${exam}'`;
   }
   if(mobile){
    q += `,mobile=${mobile}`;
   }
   if(website){
    q += `,website='${website}'`;
   }
   if(twitter){
    q += `,twitter='${twitter}'`;
   }
   if(instagram){
    q += `,instagram='${instagram}'`;
   }
   if(github){
    q += `,github='${github}'`;
   }
   if(linkedin){
    q += `,linkedin='${linkedin}'`;
   }
   
   pool.query(q,(err,result)=>{
    if (err) throw err;
    res.redirect(`/user/${role}/${username}`);
   });

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
        pool.query(`INSERT INTO users(username) values('${username}')`,(error, results2)=>{
            if (error) {
                throw error;
            }
            let wrong = false;
            res.status(200).render('loginStudent.ejs',{wrong});
        })
        
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
        pool.query(`INSERT INTO users(username) values('${username}')`,(error, results2)=>{
            if (error) {
                throw error;
            }
            let wrong = false;
            res.status(200).render('loginTeacher.ejs',{wrong});
        })
        
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
    console.log(username);
    user = username;

    try {
        const userResult = await pool.query('SELECT fullname FROM StudentRegistrations WHERE username = $1 AND password = $2', [username, password]);

        if (userResult.rows.length === 1) {
            const name = userResult.rows[0].fullname;
            console.log(username);
            
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
    const { name, description, optionA, optionB, optionC, optionD, correctAnswer, difficulty, subject } = req.body;
    // console.log(`("${name}", "${description}", "${optionA}", "${optionB}", "${optionC}", "${optionD}", "${correctAnswer}", "${difficulty}", "${subject}")`);
    pool.query(`INSERT INTO questions (name, description, optionA, optionB, optionC, optionD, correctAnswer, difficulty, subject) VALUES ('${name}', '${description}', '${optionA}', '${optionB}', '${optionC}', '${optionD}', '${correctAnswer}', '${difficulty}', '${subject}')`, (error, results) => {
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
        const result = await pool.query('SELECT * FROM posts WHERE questionId = $1', [questionId]);
        if (result.rows.length > 0) {
            res.render('post.ejs', { posts: result.rows,questionId,username:user});
        } else {
            res.redirect(`/posts/${questionId}/new`);
        }
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});
app.post('/post/:id', async (req, res) => {
    try {
        // Extract information from the request body
        let { username, content } = req.body;
        let questionId = req.params.id;

        // SQL query to insert data into the posts table
        const insertQuery = `
            INSERT INTO posts (questionid, username, content) 
            VALUES ($1, $2, $3) RETURNING postid;
        `;

        // Execute the query
        const result = await pool.query(insertQuery, [questionId, username, content]);

        // You can log the returned postid if needed
        console.log(result.rows[0].username);
        console.log("Inserted post with ID:", result.rows[0].postid);

        // Redirect to the posts route after inserting
        res.redirect(`/post/${questionId}`);
    } catch (err) {
        console.error("Error inserting post:", err);
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
            
            // Fetching all related comments/replies for the main post
            const repliesResult = await pool.query('SELECT * FROM posts WHERE replyid = $1', [post.postid]);

            const replies = repliesResult.rows;
            res.render('show.ejs', { post, replies, questionId });
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
        res.render('practicePage.ejs',{question});
    } catch (err) {
        res.status(500).send('Error fetching question with id');
    }
});

app.get('/questions/:subject', async (req, res) => {
    const subject = req.params.subject;
    const searchTerm = req.query.search || '';
    // console.log("query get to ho rahi hai");
    try {
        let query = "SELECT * FROM questions WHERE subject = $1";
        let queryParams = [subject];
        if (searchTerm) {
            query += ` AND name ILIKE '%${searchTerm}%'` ;
        }
        console.log(query);
        console.log(queryParams);
        // console.log("query ke pahle tak to chali");
        const result = await pool.query(query, queryParams);
        // console.log("query to chali");
        res.render('showAllQuestions.ejs',{result,subject,username:user});
    } catch (err) {
        // console.log("query get to ho rahi hai try chalna start hua but error aa gai");
        res.status(500).send('Error fetching questions.');
    }
});

app.post("/insertSolvedData", async (req, res) => {
    try {
        const { username, questionId, timespent, date, doneStatus, subject } = req.body;
        console.log(username,questionId,timespent,date,doneStatus,subject);
        await pool.query(`INSERT INTO solved (username, questionId, timespent, date, donestatus) VALUES ($1, $2, $3, $4, $5)`, [username, questionId, timespent, date, doneStatus]);
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
                        // console.log(uploads);
                        res.render('teacher_profile.ejs',{role,username,user,details,rows,uploads});
                    });
                });
            });
           
        }
        
        // res.render('profile.ejs',{role,username,rows});
    });

});
