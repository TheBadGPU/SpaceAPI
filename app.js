const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const app = express();
const port = 3000;

app.use(bodyParser.json());

let codes = [];
function removeExpiredCodes() {
  const currentTime = Date.now();
  const newCodes = [];

  for (const codeItem of codes) {
    const codeExpirationTime = codeItem.expirationTime;

    if (currentTime < codeExpirationTime) {
      newCodes.push(codeItem); // Keep the code if it hasn't expired
    }
  }

  codes = newCodes; // Update the codes array with the non-expired codes
}

// Set up a timer to run the removeExpiredCodes function every minute
setInterval(removeExpiredCodes, 60 * 1000); // 1 minute in milliseconds

const mongoURI = 'mongodb+srv://towerofspacerbx:1Th3Tow2rOf$pace2023!@towerofspace.cojkc4c.mongodb.net/';

// Authentication Middleware
const authenticate = (req, res, next) => {
  const authKey = req.headers.authorization; // You can also check query parameters or cookies

  // Check if the authKey matches your expected token
  if (authKey === '1Th3Tow2rOf$pace2023!') {
    // Token is valid, allow the request to continue
    next();
  } else {
    // Token is invalid, return a 401 Unauthorized response
    res.status(401).json({ error: 'Unauthorized' });
  }
};  


// Connect to MongoDB
mongoose.connect(mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => {
    console.log('Connected to MongoDB');
  })
  .catch((err) => {
    console.error('Error connecting to MongoDB:', err);
  });

  const codeSchema = new mongoose.Schema({
    code: String,
    createdAt: Date,
    time: Number,
    reward: String,
    currency: String,
    expirationTime: Date,
  });
  
  const Code = mongoose.model('Code', codeSchema);
  

  const userSchema = new mongoose.Schema({
    robloxUserId: {
      type: String,
      required: true,
      unique: true,
    },
    username: {
      type: String,
      required: true,
    },
    rcodes: {
      type: [String], // Use an array type for rcodes
      required: true,
    },
    stars: {
      type: Number, // Use a Number type for stars
      required: true,
    },
  });
  

  const RobloxUser = mongoose.model('TOSPlayer', userSchema);


const banSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
  },
  banTime: {
    type: Date,
    required: true,
  },
  unbanTime: {
    type: Date,
    required: true,
  },
});

const Ban = mongoose.model('Ban', banSchema);

// Create a new route for the /ban endpoint
app.post('/ban', authenticate, async (req, res) => {
  try {
    const { userId, banTime, unbanTime } = req.body;

    // Create a new ban document and save it to the database
    const newBan = new Ban({
      userId,
      banTime: new Date(banTime),
      unbanTime: new Date(unbanTime),
    });

    await newBan.save();
    return res.status(201).json({ message: 'User banned successfully.' });
  } catch (error) {
    console.error('Error banning user:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

// Create API routes
app.get('/users', authenticate, async (req, res) => {
  try {
    const users = await RobloxUser.find();
    res.json(users);
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/get-user/:user', authenticate, async (req, res) => {
  const robloxUserId = req.params.user;

  try {
    // Find the user in the database based on their Roblox user ID
    const user = await RobloxUser.findOne({ robloxUserId });

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    res.json(user);
  } catch (error) {
    console.error('Error fetching user data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


app.post('/create-user', authenticate, async (req, res) => {
  try {
    const { robloxUserId, username, rcodes, stars } = req.body;

    // Check if the user already exists
    const existingUser = await RobloxUser.findOne({ robloxUserId });

    if (existingUser) {
      // User already exists, return an error response
      return res.status(400).json({ error: 'User with this robloxUserId already exists' });
    }

    // Create a new user in the database
    const newUser = new RobloxUser({
      robloxUserId,
      username,
      rcodes: rcodes || [], // Provide default values if needed
      stars: stars || 0,
    });

    // Save the user to the database
    await newUser.save();

    res.json(newUser);
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});



app.put('/update-user/:user', authenticate, async (req, res) => {
  const robloxUserId = req.params.user;

  try {
    const updatedUserData = req.body; // Assuming the request body contains the updated data

    // Update the player's data in the database based on their Roblox user ID
    const updatedUser = await RobloxUser.findOneAndUpdate({ robloxUserId }, updatedUserData, { new: true });

    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found.' });
    }

    res.json(updatedUser);
  } catch (error) {
    console.error('Error updating user data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


app.post('/store-code/:code', authenticate, async (req, res) => {
  const { code } = req.params;
  const { time, reward, currency } = req.body;

  if (!code) {
    return res.status(400).json({ error: 'Code is required.' });
  }

  const createdAt = Date.now(); // Record the current time
  const expirationTime = new Date(createdAt + time * 1000); // Calculate expiration time

  try {
    // Create a new code document and save it to the database
    const newCode = new Code({
      code,
      createdAt,
      time,
      reward,
      currency,
      expirationTime,
    });

    await newCode.save();
    return res.status(201).json({ message: 'Code stored successfully.' });
  } catch (error) {
    console.error('Error storing code:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

app.post('/redeem-code/:user/:code', authenticate, async (req, res) => {
  try {
    const { user, code } = req.params;

    if (!code) {
      return res.status(400).json({ error: 'Code is required.' });
    }

    // Retrieve the user's data from the database by user ID or username
    const userToUpdate = await RobloxUser.findOne({ robloxUserId: user });

    if (!userToUpdate) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // Check if the code exists in the database
    const existingCode = await Code.findOne({ code });

    if (!existingCode) {
      return res.status(404).json({ error: 'Code not found.' });
    }

    // Check if the code has expired
    const currentTime = new Date();
    if (existingCode.expirationTime < currentTime) {
      return res.status(400).json({ error: 'Code has expired.' });
    }

    // Update the user's rcodes array by adding the new code
    userToUpdate.rcodes.push(code);

    // Save the updated user data back to the database
    await userToUpdate.save();

    return res.status(201).json({ message: 'Code redeemed successfully.' });
  } catch (error) {
    console.error('Error redeeming code:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/delete-code/:code', authenticate, async (req, res) => {
  const { code } = req.params;

  if (!code) {
    return res.status(400).json({ error: 'Code is required.' });
  }

  try {
    // Find and delete the code from the database
    const deletedCode = await Code.findOneAndDelete({ code });

    if (!deletedCode) {
      return res.status(404).json({ error: 'Code not found.' });
    }

    return res.status(200).json({ message: 'Code deleted successfully.' });
  } catch (error) {
    console.error('Error deleting code:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});


app.get('/get-codes', authenticate, async (req, res) => {
  try {
    // Fetch all codes from the database
    const codes = await Code.find();

    return res.status(200).json(codes);
  } catch (error) {
    console.error('Error fetching codes:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});


app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

