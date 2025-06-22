// --- DEPENDENCY IMPORTS ---

// Import and configure 'dotenv' to load environment variables from a .env file
// This MUST be the first line to ensure all environment variables are available globally.
import 'dotenv/config';

// Import the Express framework to create and manage the web server.
import express from 'express';


// --- INITIAL SETUP & CONFIGURATION ---

// Create an instance of the Express application.
const app = express();

// Define the port for the server. It will use the port from the .env file,
// or default to 3000 if it's not specified.
const PORT = process.env.PORT || 3000;


// --- MIDDLEWARE SETUP ---

// Serve static files (like images, CSS, or client-side JS) from the 'public' directory.
// This allows the browser to access files like '/images/LOGO.png'.
app.use(express.static('public'));

// Set EJS (Embedded JavaScript) as the template engine for rendering dynamic HTML pages.
app.set('view engine', 'ejs');

// Use the URL-encoded middleware to parse incoming form data.
// 'extended: true' allows for rich objects and arrays to be encoded into the URL-encoded format.
// This makes form data available in `req.body`.
app.use(express.urlencoded({ extended: true }));


// --- ROUTE DEFINITIONS ---

// Define the route for the homepage (GET request to '/').
app.get('/', (req, res) => {
  // Render the 'index.ejs' view and pass empty strings for the initial state.
  // This prevents errors when the page first loads before any data is submitted.
  res.render('index', {
    originaltext: '',
    corrected: ''
  });
});

// Define the route to handle the form submission (POST request to '/correct').
// The 'async' keyword allows us to use 'await' for the API call.
app.post('/correct', async (req, res) => {
  // Get the user's input text from the form body. '.trim()' is removed to preserve whitespace.
  const text = req.body.text; 
  
  // Basic validation: if the text is empty, re-render the page with an error message.
  if (!text) {
    return res.render('index', {
      corrected: 'Please enter some text',
      originaltext: text,
    });
  }

  // Use a try...catch block to handle potential errors during the API call.
  try {
    // Retrieve the API key and model name from environment variables and constants.
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    const GEMINI_MODEL = 'gemini-1.5-flash';

    // Construct the detailed prompt for the Gemini API.
    // This prompt explicitly instructs the AI to correct grammar and preserve line breaks.
    const promptContent = `You are an expert grammar assistant. Correct the spelling and grammar in the following text.
IMPORTANT: Preserve the original line breaks from the user's input. Process each line independently.
Correct this text:
"${text}"`;

    // --- GOOGLE GEMINI API CALL using native fetch ---
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST', // Specify the HTTP method.
      headers: {
        'Content-Type': 'application/json', // Tell the API we're sending JSON data.
      },
      // The body of the request, containing the prompt and configuration, converted to a JSON string.
      body: JSON.stringify({
        contents: [
          {
            role: 'user', // The role is 'user' as we are providing the prompt.
            parts: [
              {
                text: promptContent, // The actual prompt content.
              },
            ],
          },
        ],
        // Configuration for the AI's response generation.
        generationConfig: {
          temperature: 0.7, // Controls the "creativity" of the response.
          maxOutputTokens: 1000, // Limits the length of the response.
        },
      }),
    });

    // Check if the API response was not successful (e.g., status 400 or 500).
    if (!response.ok) {
      // Try to parse the error details from the API's JSON response.
      const errorData = await response.json().catch(() => ({ message: 'Unknown API error' }));
      console.error('Gemini API Error:', response.status, response.statusText, errorData);
      // Render the page with a specific error message from the API.
      return res.render('index', {
        corrected: `Error from API (${response.status}): ${errorData.error?.message || errorData.message || 'Unable to process the request.'}`,
        originaltext: text,
      });
    }

    // If the response is successful, parse the JSON data from the body.
    const data = await response.json();
    
    // Safely extract the corrected text from the deeply nested API response structure.
    // This long line is a "safe navigation" check to prevent errors if any part of the path is missing.
    const correctedText = data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0] ?
                          data.candidates[0].content.parts[0].text.trim() : // We trim here to remove any unwanted whitespace from the AI's response itself.
                          'No correction found or unexpected API response format.';

    // Render the 'index.ejs' page again, this time passing both the original and the corrected text.
    res.render('index', {
      corrected: correctedText,
      originaltext: text,
    });

  // Catch any network-related errors or other exceptions that occurred during the 'try' block.
  } catch (error) {
    console.error('Fetch error:', error);
    // Render the page with a generic error message.
    res.render('index', {
      corrected: 'Error: Unable to process the request. Please check your network or API key.',
      originaltext: text,
    });
  }
});


// --- START THE SERVER ---

// Start the server and make it listen for incoming requests on the specified port.
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
