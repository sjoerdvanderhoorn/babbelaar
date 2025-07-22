# Babbelaar - Language Learning Through Conversations

Babbelaar is a language learning app that helps you learn a foreign language through personalized conversations with an AI teacher. By default, it uses a free LLM service courteously provided by [LLM7.io](https://llm7.io/), but you can also configure it to use OpenAI's ChatGPT with your own API key.

This app runs completely in your browser, with no server-side component—your data stays local and only conversation messages are sent to the configured AI service.

## Try it Online

You can try Babbelaar online at: **[https://www.babbelaar.com/](https://www.babbelaar.com/)**

Or self-host it by downloading this repository: **[https://github.com/sjoerdvanderhoorn/babbelaar](https://github.com/sjoerdvanderhoorn/babbelaar)**

## Features

- **Profile Setup**: Create a personalized profile with your interests, education, travel experience, and language goals
- **Interactive Conversations**: Chat with an AI teacher in your target language
- **Word Translation**: Click on any word to see its translation in your native language
- **Suggested Words**: Get helpful word suggestions during conversations
- **Progress Tracking**: All conversations are saved locally in your browser and can be used in continued conversations
- **Correction & Feedback**: The AI teacher corrects your messages and provides explanations

## Supported Languages

- Albanian
- Arabic
- Armenian
- Awadhi
- Azerbaijani
- Bashkir
- Basque
- Belarusian
- Bengali
- Bhojpuri
- Bosnian
- Brazilian Portuguese
- Bulgarian
- Cantonese (Yue)
- Catalan
- Chhattisgarhi
- Chinese
- Croatian
- Czech
- Danish
- Dogri
- Dutch
- English
- Estonian
- Faroese
- Finnish
- French
- Galician
- Georgian
- German
- Greek
- Gujarati
- Haryanvi
- Hindi
- Hungarian
- Icelandic
- Indonesian
- Irish
- Italian
- Japanese
- Javanese
- Kannada
- Kashmiri
- Kazakh
- Konkani
- Korean
- Kyrgyz
- Latvian
- Lithuanian
- Macedonian
- Maithili
- Malay
- Maltese
- Mandarin Chinese
- Marathi
- Marwari
- Min Nan
- Moldovan
- Mongolian
- Montenegrin
- Nepali
- Norwegian
- Oriya
- Pashto
- Persian (Farsi)
- Polish
- Portuguese
- Punjabi
- Rajasthani
- Romanian
- Russian
- Sanskrit
- Santali
- Serbian
- Sindhi
- Sinhala
- Slovak
- Slovene
- Slovenian
- Spanish
- Swahili
- Swedish
- Tagalog
- Tajik
- Tamil
- Tatar
- Telugu
- Thai
- Turkish
- Turkmen
- Ukrainian
- Urdu
- Uzbek
- Vietnamese
- Welsh
- Wu

## Requirements

- **No setup required**: Works out of the box with the free LLM service provided by [LLM7.io](https://llm7.io/)
- **Optional**: OpenAI API key for ChatGPT (get one at https://platform.openai.com/)
- Alternative LLM providers are also supported, as long as they support the Chat Completions API.

## How It Works

1. **First Visit**: You'll be prompted to create a profile
2. **Conversations**: The AI teacher starts conversations based on your interests and level
3. **Word Learning**: Important conversational words like greetings, basic phrases, and topic-specific vocabulary are introduced
4. **Corrections**: When you make mistakes, the teacher provides corrections and explanations
5. **Progress**: All conversations are saved in your browser's local storage

## Technical Details

- **Frontend**: Pure HTML, CSS, and JavaScript (no external libraries)
- **Default AI**: Free LLM service provided by [LLM7.io](https://llm7.io/)
- **Optional AI**: OpenAI Chat Completions API and other compatible providers
- **Storage**: Browser localStorage for profile and conversation history

## Privacy

- All data is stored locally in your browser
- Your API key (if used) is stored locally and never sent to our servers
- Only your conversations are sent to the configured AI service (LLM7.io by default, or OpenAI if configured)
- Future versions will support exporting data to cloud storage services

## Future Enhancements

- Text-to-speech (TTS) for pronunciation
- Speech recognition for voice input
- Export/import profile and conversation data
- Cloud storage integration (OneDrive, Dropbox)
- More advanced language learning features

## Troubleshooting

**Can't send messages?**
- Try the default LLM7.io service first (no API key required)
- If using OpenAI, check your API key
- Ensure you have internet connection
- If using OpenAI, verify your API key has sufficient credits

**Translations not working?**
- Make sure the conversation has started
- Only teacher messages have clickable words
- Try refreshing the page if issues persist

**Profile not saving?**
- Ensure all required fields are filled
- Check if your browser allows localStorage
- Try clearing browser cache and starting over
