import 'dotenv/config';
import express from 'express';

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.render('index', {
    originaltext: '',
    corrected: ''
  });
});

app.post('/correct', async (req, res) => {
  const text = req.body.text; 
  
  if (!text) {
    return res.render('index', {
      corrected: 'Please enter some text',
      originaltext: text,
    });
  }

  try {
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    const GEMINI_MODEL = 'gemini-1.5-flash';

    const promptContent = `You are an expert grammar assistant. Correct the spelling and grammar in the following text.
IMPORTANT: Preserve the original line breaks from the user's input. Process each line independently.
Correct this text:
"${text}"`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: promptContent,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1000,
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Unknown API error' }));
      console.error('Gemini API Error:', response.status, response.statusText, errorData);
      return res.render('index', {
        corrected: `Error from API (${response.status}): ${errorData.error?.message || errorData.message || 'Unable to process the request.'}`,
        originaltext: text,
      });
    }

    const data = await response.json();
    
    const correctedText = data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0] ?
                          data.candidates[0].content.parts[0].text.trim() :
                          'No correction found or unexpected API response format.';

    res.render('index', {
      corrected: correctedText,
      originaltext: text,
    });
  } catch (error) {
    console.error('Fetch error:', error);
    res.render('index', {
      corrected: 'Error: Unable to process the request. Please check your network or API key.',
      originaltext: text,
    });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
