const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const session = require('express-session');
const path = require('path');
const cors = require('cors');

const app = express();
const port = 3000;

let useridvar=-1;
// Middleware to parse the request body
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cors());

// Serve static files (HTML) from the "public" directory
app.use(express.static(path.join(__dirname, 'public')));

// Session middleware (you can use a secure cookie if needed)
app.use(session({
    secret: 'secret_key',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: true } // If using HTTPS, set secure: true
}));

// MySQL connection setup
const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'abcd',  // Use your MySQL password here
    database: 'studymate',   // Your database name
    connectionLimit: 10,
});

// POST endpoint to handle login
app.post('/login', (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required.' });
    }

    pool.query('SELECT * FROM Users WHERE email = ?', [email], (err, results) => {
        if (err) {
            console.log(err);
            return res.status(500).json({ message: 'Database error' });
        }

        if (results.length === 0) {
            return res.status(400).json({ message: 'Invalid email or password' });
        }

        const user = results[0];
        // Checking password (not using bcrypt here as per your request)
        if (user.password !== password) {
            return res.status(400).json({ message: 'Invalid password' });
        }

        // Store user ID in session
        req.session.userId = user.user_id;
        useridvar=user.user_id;
        //sessionStorage.setItem('userId', useridvar);
        return res.json({ message: 'Login successful', userId: user.user_id });
    });
});

// POST endpoint to handle signup
app.post('/signup', (req, res) => {
    const {email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Please provide email, and password' });
    }
    pool.query('INSERT INTO Users (name, email, password) VALUES (?, ?, ?)', ['', email, password], (err, results) => {
        if (err) {
                console.error(err);
                return res.status(500).json({ message: 'Error creating user' });
        }
        let user;
        pool.query('Select user_id from users where email=(?)',[email], (err1,res1) => {
            if(err){
                console.error(err);
                return res.status(500).json({ message: 'Error getting user id' });
            }
            user = res1[0];
            useridvar=user.user_id;
        });
        //sessionStorage.setItem('userId', useridvar);
        return res.json({ message: 'User created successfully' });
    });
});    

app.post('/addtasks', (req,res) => {
    const {task_description, status} =req.body;
    if(!task_description){
        return res.status(400).json({ message: 'Please provide task description' });
    }
    pool.query('INSERT INTO Tasks (user_id, task_description, status) values (?, ?, ?)', [useridvar, task_description, status], (err,results)=>{
        if(err) {
            console.error(err);
            return res.status(500).json({message: 'Error adding task'});
        }
        return res.json({ message: 'Task added successfully' });
    });
});

//loading the tasks from database and displaying them
app.post('/loadtasks', (req,res) =>{
    pool.query('Select task_description,status,task_id from tasks where user_id=(?)', useridvar, (err,results) =>{
        if(err){
            console.error(err);
            return res.status(500).json({message: 'Error loading tasks'});
        }
        return res.json({tasks: results});
    });
});

//updating task status based on event listener
app.post('/updatetasks', (req,res) => {
    const {task_id, stat} =req.body;
    pool.query('Update tasks set status=? where task_id = ?',[stat, task_id], (err,results) =>{
        if(err){
            console.error(err);
            return res.status(500).json({message: 'Unable to update task status'});
        }
        return res.json({message: 'Task updated'});
    });
});

//to display the progress
app.post('/displayprogress', (req,res) => {
    var total1=0;
    var comp1=0;
    pool.query('Select count(*) as total from tasks where user_id = ?',[useridvar], (err,results) =>{
        if(err){
            console.error(err);
            return res.status(500).json({message: 'Unable to find total tasks'});
        }
        total1=results[0]['total'];
        pool.query('Select count(*) as comp from tasks where user_id = ? and status = 1',[useridvar], (err,results) =>{
            if(err){
                console.error(err);
                return res.status(500).json({message: 'Unable to find completed tasks'});
            }
            comp1=results[0]['comp'];
            return res.json({total: total1, comp: comp1, message:'Can display'});
        });
    });
});

//to add a session
app.post('/addsessions', (req,res) => {
    const {subject, stime, etime}=req.body;
    pool.query('insert into sessions (user_id, start_time, end_time, subject_name) values (?,?,?,?)',[useridvar, stime, etime,subject], (err,results) =>{
        if(err){
            console.error(err);
            return res.status(500).json({message: 'Unable to add session'});
        }
        return res.json({message: 'Session added successfully', sessid: results});
    });
});

//to display sessions
app.post('/displaysessions', (req,res) => {
    pool.query('select session_id, subject_name, start_time, end_time from sessions where user_id=?',[useridvar], (err,results) =>{
        if(err){
            console.error(err);
            return res.status(500).json({message: 'Unable to display sessions'});
        }
        return res.json({sessions: results});
    });
});

//to delete the sessions
app.post('/deletesessions', (req,res) =>{
    const {session_id} = req.body;
    pool.query('delete from sessions where session_id=?',[session_id], (err,results) =>{
        if(err){
            console.error(err);
            return res.status(500).json({message: 'Unable to delete session'});
        }
        return res.json({message: 'Session deleted successfully'});
    });
});

//to add a subject
app.post('/addsubject', (req,res) =>{
    const {subject, credits, chapters} = req.body;
    pool.query('insert into subject (credits, sname, chapters, user_id) values (?, ?, ?, ?)',[credits, subject, chapters, useridvar], (err,results) =>{
        if(err){
            console.error(err);
            return res.status(500).json({message: 'Unable to add subject'});
        }
        return res.json({message: 'Subject added successfully'});
    });
});

//to load subjects
app.post('/loadsubjects', (req,res) =>{
    pool.query('select subject_id, sname from subject where user_id=(?)',[useridvar], (err,results) =>{
        if(err){
            console.error(err);
            return res.status(500).json({message: 'Unable to load subjects'});
        }
        return res.json({message: 'Subjects fetched successfully', subjects: results});
    });
});

//to add an exam
app.post('/addexams', (req,res) =>{
    const {subjectId, syllabus, date} =req.body;
    pool.query('insert into exam (syllabus, day, subject_id) values (?,?,?)',[syllabus, date, subjectId], (err, results) =>{
        if(err){
            console.error(err);
            return res.status(500).json({message: 'Unable to add exam'});
        }
        return res.json({message: 'Exam added successfully'});
    });
});

//to load exams
app.post('/loadexams', (req,res) =>{
    const {subjid} = req.body;
    pool.query('select syllabus, day from exam where subject_id=?', [subjid], (err,results) =>{
        if(err){
            console.error(err);
            return res.status(500).json({message: 'Unable to load exams'});
        }
        return res.json({message: 'Exams fetched successfully', exams: results});
    });
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
