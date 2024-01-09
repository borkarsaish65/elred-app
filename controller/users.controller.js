const Users = require("../models/users");
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const jwtSecret = process.env.jwtSecret;

function validatePassword(password) {
    // Minimum 8 characters, at least one uppercase letter, one lowercase letter, and one number
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

    return passwordRegex.test(password);
}

function validateNameId(name_id) {
    // alphanumeric string between 3 to 15 characters
    const nameIdRegex = /^[a-zA-Z0-9]{3,15}$/;

    return nameIdRegex.test(name_id);
}


class UserController {

    signUp = async (req, res, next) => {

        console.log(req.body,'<--body')

        let {
            name,
            username,
            password
        } = req.body


        let userFromDB = await Users.findOne({
            username
        });

        console.log(userFromDB,"<-- user from DB");

        if(userFromDB)
        {
            return res.status(400).json({
                error: 'username already taken! Please use another username.'
            });
        }

        if (!validatePassword(password)) {
            return res.status(400).json({
                error: 'Password does not meet the criteria.Need minimum 8 characters, at least one uppercase letter, one lowercase letter, and one number'
            });
        }

        let hashedPassword = await bcrypt.hash(password, 10);

        const user = new Users({
            name,
            username,
            password:hashedPassword
        })


        let result = await user.save();

        console.log(result);

        res.status(200).json({
            status:'successful',
            message:'User account created successfully!'
        })
     
    }
    login = async (req, res, next) => {


        let {
            username,
            password
        } = req.body;

    
        let userFromDB = await Users.findOne({
            username
        });

        if(!userFromDB)
        {
            return res.status(400).json({
                error: 'username or password is invalid!'   
                // The generic error message is used intentionally for security reasons.
                // It prevents hackers from pinpointing the exact issue and helps protect user accounts. 
            });
        }

        let isPasswordValid = await bcrypt.compare(password,userFromDB.password)

        if (!isPasswordValid) {
            return res.status(400).json({
                error: 'username or password is invalid!'   
                // The generic error message is used intentionally for security reasons.
                // It prevents hackers from pinpointing the exact issue and helps protect user accounts. 
            });
        }

        let token = jwt.sign({ id:userFromDB.id,username:userFromDB.username }, jwtSecret, { expiresIn: '1h' });

        res.status(200).json({
            message:'Login successful!',
            token
        })
    }
    getAllUsers = async(req,res,next)=>{

        let allUsers = await Users.find();
    
        
        res.status(200).json({
            allUsers
        })

    }
}

module.exports = new UserController;