class Babbelaar {
    constructor() {
        this.profile = null;
        this.conversations = [];
        this.currentTranslations = {};
        this.translationLibrary = {};
        this.typingPreviewBubble = null;
        this.thinkingBubble = null;
        this.isWaitingForResponse = false;
        this.hasStartedConversation = false;
        this.currentAudio = null;
        this.audioQueue = [];
        this.isPlayingAudio = false;
        this.currentPlayingButton = null;
        this.loadingButtons = new Set();
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.isRecording = false;
        this.microphoneStream = null;
        this.microphonePermissionGranted = false;
        this.init();
    }

    init() {
        this.loadProfile();
        this.setupEventListeners();

        if (this.profile) {
            this.showChatScreen();
        } else {
            this.showProfileScreen();
        }
    }

    setupEventListeners() {
        // Profile form submission
        document.getElementById('profile-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveProfile();
        });

        // Profile button in chat
        document.getElementById('profile-btn').addEventListener('click', () => {
            this.showProfileScreen();
        });

        // Send message
        document.getElementById('send-btn').addEventListener('click', () => {
            this.sendMessage();
        });

        // Enter key to send message
        document.getElementById('message-input').addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // Show typing preview as user types
        document.getElementById('message-input').addEventListener('input', (e) => {
            this.updateTypingPreview(e.target.value);
        });

        // Handle when user stops typing
        document.getElementById('message-input').addEventListener('blur', () => {
            this.hideTypingPreview();
        });

        // Close translation popup
        document.getElementById('close-popup').addEventListener('click', () => {
            this.hideTranslationPopup();
        });

        // Click outside popup to close
        document.getElementById('translation-popup').addEventListener('click', (e) => {
            if (e.target.id === 'translation-popup') {
                this.hideTranslationPopup();
            }
        });

        // Advanced settings toggle
        document.getElementById('advanced-toggle').addEventListener('click', (e) => {
            e.preventDefault();
            this.toggleAdvancedSettings();
        });

        // LLM7 preset button
        document.getElementById('llm7-preset').addEventListener('click', () => {
            this.setLLM7Preset();
        });

        // ChatGPT preset button
        document.getElementById('chatgpt-preset').addEventListener('click', () => {
            this.setChatGPTPreset();
        });

        // Clear conversation history button
        document.getElementById('clear-history-btn').addEventListener('click', () => {
            this.clearConversationHistory();
        });

        // View system prompt button
        document.getElementById('view-system-prompt').addEventListener('click', (e) => {
            e.preventDefault();
            this.showSystemPromptModal();
        });

        // View conversation history button
        document.getElementById('view-conversation-history-btn').addEventListener('click', () => {
            this.showConversationHistoryModal();
        });

        // TTS toggle
        document.getElementById('use-tts').addEventListener('change', (e) => {
            this.toggleTTSOptions(e.target.checked);
        });

        // STT toggle
        document.getElementById('use-stt').addEventListener('change', (e) => {
            this.toggleSTTOptions(e.target.checked);
        });

        // Microphone button
        document.getElementById('mic-btn').addEventListener('click', () => {
            this.toggleSpeechRecognition();
        });

        // Close system prompt modal
        document.getElementById('close-system-prompt-modal').addEventListener('click', () => {
            this.hideSystemPromptModal();
        });

        // Close conversation history modal
        document.getElementById('close-conversation-history-modal').addEventListener('click', () => {
            this.hideConversationHistoryModal();
        });

        // Click outside system prompt modal to close
        document.getElementById('system-prompt-modal').addEventListener('click', (e) => {
            if (e.target.id === 'system-prompt-modal') {
                this.hideSystemPromptModal();
            }
        });

        // Click outside conversation history modal to close
        document.getElementById('conversation-history-modal').addEventListener('click', (e) => {
            if (e.target.id === 'conversation-history-modal') {
                this.hideConversationHistoryModal();
            }
        });

        // Handle window resize to adjust chat container padding
        window.addEventListener('resize', () => {
            setTimeout(() => {
                this.adjustChatContainerPadding();
            }, 100);
        });

        // Clean up microphone stream when page is about to unload
        window.addEventListener('beforeunload', () => {
            this.cleanupMicrophone();
        });
    }

    showProfileScreen() {
        document.getElementById('profile-screen').classList.remove('hidden');
        document.getElementById('chat-screen').classList.add('hidden');

        if (this.profile) {
            this.populateProfileForm();
        } else {
            // Initialize TTS options visibility for new users
            this.toggleTTSOptions(false);
        }
        
        // Update clear history button visibility
        this.updateClearHistoryButtonVisibility();
    }

    showChatScreen() {
        document.getElementById('profile-screen').classList.add('hidden');
        document.getElementById('chat-screen').classList.remove('hidden');
        
        // Initialize microphone button visibility based on STT settings
        this.toggleSTTOptions(this.profile && this.profile.useStt);
        
        // Adjust padding after the screen is shown
        setTimeout(() => {
            this.adjustChatContainerPadding();
        }, 100);
        
        this.startConversation();
    }

    toggleAdvancedSettings() {
        const advancedOptions = document.getElementById('advanced-options');
        const toggle = document.getElementById('advanced-toggle');
        
        if (advancedOptions.style.display === 'none') {
            advancedOptions.style.display = 'block';
            toggle.innerHTML = '⚙️ Hide Advanced Settings';
        } else {
            advancedOptions.style.display = 'none';
            toggle.innerHTML = '⚙️ Advanced Settings';
        }
    }

    setLLM7Preset() {
        // Set LLM7 defaults
        document.getElementById('api-endpoint').value = 'https://api.llm7.io/v1/chat/completions';
        document.getElementById('model-name').value = 'gpt-4.1-mini';
        document.getElementById('api-key').value = 'unused';
        
        // The AI settings section is already visible since the buttons are inside it
    }

    setChatGPTPreset() {
        // Set ChatGPT defaults
        document.getElementById('api-endpoint').value = 'https://api.openai.com/v1/chat/completions';
        document.getElementById('model-name').value = 'gpt-4o-mini';
        document.getElementById('api-key').value = '';
        
        // The AI settings section is already visible since the buttons are inside it
    }

    toggleTTSOptions(enabled) {
        const ttsOptions = document.getElementById('tts-options');
        if (enabled) {
            ttsOptions.style.display = 'block';
        } else {
            ttsOptions.style.display = 'none';
        }
    }

    toggleSTTOptions(enabled) {
        const sttOptions = document.getElementById('stt-options');
        if (sttOptions) {
            if (enabled) {
                sttOptions.style.display = 'block';
                // Initialize microphone when STT is enabled
                this.initializeMicrophone();
            } else {
                sttOptions.style.display = 'none';
                // Clean up microphone when STT is disabled
                this.cleanupMicrophone();
            }
        }
        
        // Show/hide microphone button in chat screen
        const micBtn = document.getElementById('mic-btn');
        if (micBtn) {
            micBtn.style.display = enabled ? 'flex' : 'none';
        }
    }

    populateProfileForm() {
        const form = document.getElementById('profile-form');
        
        // If no profile exists, set defaults for new users
        if (!this.profile) {
            this.setDefaultValues();
            return;
        }
        
        // Populate form with existing profile data
        Object.keys(this.profile).forEach(key => {
            const element = form.elements[key];
            if (element) {
                if (element.type === 'checkbox') {
                    element.checked = this.profile[key] === true || this.profile[key] === 'true';
                } else {
                    element.value = this.profile[key];
                }
            }
        });
        
        // Set defaults for any missing values (for existing users upgrading)
        this.setDefaultValues(true);
        
        // Initialize TTS options visibility
        const useTtsElement = document.getElementById('use-tts');
        if (useTtsElement) {
            this.toggleTTSOptions(useTtsElement.checked);
        }
        
        // Initialize STT options visibility
        const useSttElement = document.getElementById('use-stt');
        if (useSttElement) {
            this.toggleSTTOptions(useSttElement.checked);
        }
        
        // Set default checkbox values if not already set
        if (!this.profile || this.profile.useTts === undefined) {
            document.getElementById('use-tts').checked = false;
        }
        if (!this.profile || this.profile.autoPlayVoice === undefined) {
            document.getElementById('auto-play-voice').checked = false;
        }
        if (!this.profile || this.profile.useStt === undefined) {
            document.getElementById('use-stt').checked = false;
        }
        if (!this.profile || this.profile.autoSendSpeech === undefined) {
            document.getElementById('auto-send-speech').checked = false;
        }
    }

    setDefaultValues(onlyMissing = false) {
        const defaults = {
            'api-endpoint': 'https://api.llm7.io/v1/chat/completions',
            'model-name': 'gpt-4.1-mini',
            'api-key': '',
            'tts-endpoint': 'https://api.openai.com/v1/audio/speech',
            'tts-model': 'gpt-4o-mini-tts',
            'tts-api-key': '',
            'tts-voice-corrected': 'coral',
            'tts-voice-reply': 'sage',
            'tts-instructions': 'Voice: Warm, empathetic, and professional, reassuring the customer that their issue is understood and will be resolved. Punctuation: Well-structured with natural pauses, allowing for clarity and a steady, calming flow. Delivery: Calm and patient, with a supportive and understanding tone that reassures the listener. Phrasing: Clear and concise, using customer-friendly language that avoids jargon while maintaining professionalism. Tone: Empathetic and solution-focused, emphasizing both understanding and proactive assistance.',
            'stt-endpoint': 'https://api.openai.com/v1/audio/transcriptions',
            'stt-model': 'whisper-1',
            'stt-api-key': ''
        };
        
        Object.keys(defaults).forEach(fieldId => {
            const element = document.getElementById(fieldId);
            if (element && (!onlyMissing || !element.value)) {
                element.value = defaults[fieldId];
            }
        });
    }

    saveProfile() {
        const formData = new FormData(document.getElementById('profile-form'));
        const profile = Object.fromEntries(formData.entries());
        
        // Handle checkboxes (they won't appear in FormData if unchecked)
        profile.useTts = document.getElementById('use-tts').checked;
        profile.autoPlayVoice = document.getElementById('auto-play-voice').checked;
        profile.useStt = document.getElementById('use-stt').checked;
        profile.autoSendSpeech = document.getElementById('auto-send-speech').checked;
        
        this.profile = profile;

        localStorage.setItem('babbelaar_profile', JSON.stringify(this.profile));

        this.showChatScreen();
    }

    loadProfile() {
        const saved = localStorage.getItem('babbelaar_profile');
        if (saved) {
            this.profile = JSON.parse(saved);
        }

        const savedConversations = localStorage.getItem('babbelaar_conversations');
        if (savedConversations) {
            this.conversations = JSON.parse(savedConversations);
        }

        const savedTranslations = localStorage.getItem('babbelaar_translation_library');
        if (savedTranslations) {
            this.translationLibrary = JSON.parse(savedTranslations);
        }
    }

    async startConversation() {
        if (!this.hasStartedConversation) {
            this.hasStartedConversation = true;
            // Always start fresh with a new teacher message that considers previous conversations
            await this.getTeacherResponse("", true);
        }
    }

    displayConversationHistory() {
        const messagesContainer = document.getElementById('messages');
        messagesContainer.innerHTML = '';

        this.conversations.forEach(conv => {
            if (conv.studentMessage) {
                this.addMessageInternal(conv.studentMessage, 'student');

                // Show corrected message if it exists and is different
                if (conv.correctedMessage && conv.correctedMessage.trim() !== conv.studentMessage.trim()) {
                    this.addCorrectedMessageInternal(conv.correctedMessage, conv.explanation);
                }
            }
            if (conv.teacherReply) {
                this.addMessageInternal(conv.teacherReply, 'teacher', this.translationLibrary, conv.suggested);
            }
        });
        
        // Adjust padding after loading conversation history
        setTimeout(() => {
            this.adjustChatContainerPadding();
        }, 100);
    }

    async sendMessage() {
        const input = document.getElementById('message-input');
        const message = input.value.trim();

        if (!message || this.isWaitingForResponse) return;

        input.value = '';
        this.hideTypingPreview();
        this.addMessage(message, 'student');

        await this.getTeacherResponse(message);
    }

    async getTeacherResponse(studentMessage, isFirstMessage = false) {
        this.isWaitingForResponse = true;
        this.updateSendButtonState();
        this.showThinkingBubble();

        try {
            const systemPrompt = this.createSystemPrompt();
            const userPrompt = isFirstMessage ?
                "Start a conversation with me based on my profile and any previous conversations. Keep it simple and engaging." :
                studentMessage;

            // Build conversation history for context
            const messages = [{ role: 'system', content: systemPrompt }];
            
            // Add previous conversation context
            const recentConversations = this.conversations.slice(-20);
            recentConversations.forEach(conv => {
                if (conv.studentMessage && conv.studentMessage.trim()) {
                    messages.push({ role: 'user', content: conv.studentMessage });
                }
                if (conv.teacherReply && conv.teacherReply.trim()) {
                    messages.push({ role: 'assistant', content: conv.teacherReply });
                }
            });
            
            // Add current message
            messages.push({ role: 'user', content: userPrompt });

            const nativeLanguageName = this.profile.nativeLanguage;
            const targetLanguageName = this.profile.targetLanguage;
            const responseSchema = {
                "type": "object",
                "properties": {
                    "message": {
                        "type": "string",
                        "description": `Corrected version of the student's input in ${targetLanguageName}.`
                    },
                    "explanation": {
                        "type": "string",
                        "description": `Provide an explanation in ${nativeLanguageName} that clarifies the corrections made to the student's input.`
                    },
                    "reply": {
                        "type": "string",
                        "description": `Your response in ${targetLanguageName}`
                    },
                    "suggested": {
                        "type": "array",
                        "description": `Five words in ${targetLanguageName} that the student might use in response to the reply. Only suggest words that are not already used in the proper conversation. For example, when the last reply was 'Hello, how are you?', suggest words like 'good', 'fine', 'thanks'.`,
                        "items": {
                            "type": "string"
                        },
                        "maxItems": 5
                    },
                    "translations": {
                        "type": "object",
                        "description": `List every word from the message, reply, and suggested words in the target language, with translation to ${nativeLanguageName} for each, no matter how simple. Split up the words by spaces, punctuation, and special characters. For example, if the message is "Hello, how are you?", the translations should include "Hello": "Hallo", "how": "wie", "are": "sind", "you": "du".`,
                        "additionalProperties": {
                            "type": "string"
                        }
                    }
                },
                "required": ["message", "explanation", "reply", "suggested"],
                "additionalProperties": false
            };

            const apiEndpoint = this.profile.apiEndpoint || 'https://api.llm7.io/v1/chat/completions';
            const modelName = this.profile.modelName || 'gpt-4.1-mini';

            // Prepare headers
            const headers = {
                'Content-Type': 'application/json'
            };
            
            // Add Authorization header only if API key is provided
            if (this.profile.apiKey && this.profile.apiKey.trim()) {
                headers['Authorization'] = `Bearer ${this.profile.apiKey}`;
            }

            const response = await fetch(apiEndpoint, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify({
                    model: modelName,
                    messages: messages,
                    temperature: 0.7,
                    max_tokens: 1000,
                    response_format: {
                        type: "json_schema",
                        json_schema: {
                            name: "language_learning_response",
                            schema: responseSchema,
                            strict: true
                        }
                    }
                })
            });

            if (!response.ok) {
                throw new Error(`API request failed: ${response.status}`);
            }

            const data = await response.json();
            const content = data.choices[0].message.content;

            let teacherResponse;

            if (!teacherResponse) {
                try {
                    // Try to parse the content as JSON directly.
                    teacherResponse = JSON.parse(content);
                } catch (e) {
                    // explicitly unhandled
                }
            }

            if (!teacherResponse) {
                try {
                    // Try to parse JSON out of the content string before parsing. This is useful when the LLM responds with a JSON-like structure but not a valid JSON string, like "{"message": "Hello"} and some extra text" or "```json\n{"message": "Hello"}\n```".
                    teacherResponse = JSON.parse(content.slice(content.indexOf('{'), content.lastIndexOf('}') + 1));
                } catch (e) {
                    // explicitly unhandled
                }
            }

            if (!teacherResponse) {
                // Fallback if JSON parsing fails
                teacherResponse = {
                    message: studentMessage || "",
                    explanation: "",
                    reply: content,
                    suggested: [],
                    translations: {}
                };
            }

            this.processTeacherResponse(teacherResponse, studentMessage, isFirstMessage);

        } catch (error) {
            console.error('Error getting teacher response:', error);
            this.addMessage('Sorry, I encountered an error. Please check your API key and try again.', 'teacher');
        } finally {
            this.isWaitingForResponse = false;
            this.updateSendButtonState();
            this.hideThinkingBubble();
        }
    }

    processTeacherResponse(response, studentMessage, isFirstMessage) {
        // Store current translations for click functionality
        this.currentTranslations = response.translations || {};

        // Add new translations to the persistent library
        if (response.translations) {
            Object.keys(response.translations).forEach(word => {
                if (word.trim() === '') return; // Skip empty words
                if (word == null || word === undefined) return; // Skip null or undefined words
                this.translationLibrary[word.toLowerCase()] = response.translations[word];
            });
            this.saveTranslationLibrary();
        }

        // Add corrected message if there's a correction and it's not the first message
        if (!isFirstMessage && response.message && response.message.trim() !== studentMessage.trim()) {
            this.addCorrectedMessage(response.message, response.explanation);
        }

        // Add teacher's reply to chat
        this.addMessage(response.reply, 'teacher', this.translationLibrary, response.suggested);

        // Save conversation
        const conversation = {
            studentMessage: isFirstMessage ? "" : (response.message || studentMessage),
            teacherReply: response.reply,
            translations: response.translations || {},
            suggested: response.suggested || [],
            correctedMessage: response.message || "",
            explanation: response.explanation || ""
        };

        this.conversations.push(conversation);
        this.saveConversations();

        // Show suggested words
        this.showSuggestedWords(response.suggested || []);

        // Auto-play audio if enabled
        this.handleAutoPlayAudio(response, studentMessage, isFirstMessage);
    }

    async handleAutoPlayAudio(response, studentMessage, isFirstMessage) {
        if (!this.profile.useTts || !this.profile.autoPlayVoice) {
            return;
        }

        // Wait longer for DOM to update before finding buttons
        await new Promise(resolve => setTimeout(resolve, 200));

        const audioQueue = [];

        // First, generate corrected message audio if there's a correction and it's not the first message
        if (!isFirstMessage && response.message && response.message.trim() !== studentMessage.trim()) {
            const voiceCorrected = this.profile.ttsVoiceCorrected || 'coral';
            // Find the corrected message button - try multiple selectors to be more robust
            let correctedButton = document.querySelector('.message.correction:last-of-type .play-button');
            
            // If not found, try alternative selector
            if (!correctedButton) {
                const correctionMessages = document.querySelectorAll('.message.correction');
                if (correctionMessages.length > 0) {
                    const lastCorrection = correctionMessages[correctionMessages.length - 1];
                    correctedButton = lastCorrection.querySelector('.play-button');
                }
            }
            
            console.log('Corrected button found:', correctedButton); // Debug log
            
            if (correctedButton) {
                // Show loading state
                correctedButton.className = 'loading-button';
                correctedButton.innerHTML = '<span class="hourglass">⏳</span>';
                correctedButton.title = 'Loading audio...';
                correctedButton.disabled = true;
                
                const correctedAudio = await this.generateSpeech(response.message, voiceCorrected);
                if (correctedAudio) {
                    audioQueue.push({ url: correctedAudio, button: correctedButton });
                } else {
                    // Reset button on error
                    correctedButton.className = 'play-button';
                    correctedButton.innerHTML = '▶';
                    correctedButton.title = 'Play audio';
                    correctedButton.disabled = false;
                }
            } else {
                console.log('Corrected message button not found in DOM'); // Debug log
            }
        }

        // Then, generate teacher reply audio
        const voiceReply = this.profile.ttsVoiceReply || 'sage';
        // Find the teacher message button - try multiple selectors to be more robust
        let teacherButton = document.querySelector('.message.teacher:last-of-type .play-button');
        
        // If not found, try alternative selector
        if (!teacherButton) {
            const teacherMessages = document.querySelectorAll('.message.teacher');
            if (teacherMessages.length > 0) {
                const lastTeacher = teacherMessages[teacherMessages.length - 1];
                teacherButton = lastTeacher.querySelector('.play-button');
            }
        }
        
        console.log('Teacher button found:', teacherButton); // Debug log
        
        if (teacherButton) {
            // Show loading state
            teacherButton.className = 'loading-button';
            teacherButton.innerHTML = '<span class="hourglass">⏳</span>';
            teacherButton.title = 'Loading audio...';
            teacherButton.disabled = true;
            
            const replyAudio = await this.generateSpeech(response.reply, voiceReply);
            if (replyAudio) {
                audioQueue.push({ url: replyAudio, button: teacherButton });
            } else {
                // Reset button on error
                teacherButton.className = 'play-button';
                teacherButton.innerHTML = '▶';
                teacherButton.title = 'Play audio';
                teacherButton.disabled = false;
            }
        } else {
            console.log('Teacher message button not found in DOM'); // Debug log
        }

        console.log('Audio queue length:', audioQueue.length); // Debug log

        // Play audio sequentially - corrected text first, then teacher reply
        if (audioQueue.length > 0) {
            // Reset loading states before playing
            audioQueue.forEach(audioData => {
                if (audioData.button) {
                    audioData.button.className = 'play-button';
                    audioData.button.innerHTML = '▶';
                    audioData.button.title = 'Play audio';
                    audioData.button.disabled = false;
                }
            });
            
            await this.playSequentially(audioQueue);
        }
    }

    addMessage(text, sender, translations = {}, suggested = []) {
        this.addMessageInternal(text, sender, translations, suggested);
        
        // Adjust padding and scroll to bottom after adding message
        setTimeout(() => {
            this.adjustChatContainerPadding();
        }, 50);
    }

    addMessageInternal(text, sender, translations = {}, suggested = []) {
        const messagesContainer = document.getElementById('messages');
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}`;

        const bubbleDiv = document.createElement('div');
        bubbleDiv.className = 'message-bubble';

        if (sender === 'teacher' && Object.keys(translations).length > 0) {
            // Make words clickable
            bubbleDiv.innerHTML = this.makeWordsClickable(text, translations);
        } else {
            bubbleDiv.textContent = text;
        }

        messageDiv.appendChild(bubbleDiv);

        // Add play button if TTS is enabled and this is a teacher message
        if (this.profile.useTts && sender === 'teacher') {
            const voiceReply = this.profile.ttsVoiceReply || 'sage';
            const playButton = this.createPlayButton(text, voiceReply, 'teacher');
            messageDiv.appendChild(playButton);
        }

        messagesContainer.appendChild(messageDiv);
    }

    addCorrectedMessage(correctedText, explanation) {
        this.addCorrectedMessageInternal(correctedText, explanation);
        
        // Adjust padding and scroll to bottom after adding corrected message
        setTimeout(() => {
            this.adjustChatContainerPadding();
        }, 50);
    }

    addCorrectedMessageInternal(correctedText, explanation) {
        const messagesContainer = document.getElementById('messages');
        const correctionDiv = document.createElement('div');
        correctionDiv.className = 'message correction';

        const correctedBubble = document.createElement('div');
        correctedBubble.className = 'message-bubble corrected';

        // Make words clickable if translations are available
        if (Object.keys(this.translationLibrary).length > 0) {
            correctedBubble.innerHTML = this.makeWordsClickable(correctedText, this.translationLibrary);
        } else {
            correctedBubble.textContent = correctedText;
        }

        // Create a container for the button and bubble (button on the left for corrections)
        const bubbleContainer = document.createElement('div');
        bubbleContainer.style.display = 'flex';
        bubbleContainer.style.alignItems = 'flex-end';
        bubbleContainer.style.gap = '8px';
        bubbleContainer.style.justifyContent = 'flex-end'; // Align to the right like other student messages

        // Add play button if TTS is enabled (on the left side for corrections)
        if (this.profile.useTts) {
            const voiceCorrected = this.profile.ttsVoiceCorrected || 'coral';
            const playButton = this.createPlayButton(correctedText, voiceCorrected, 'corrected');
            bubbleContainer.appendChild(playButton);
        }

        bubbleContainer.appendChild(correctedBubble);
        correctionDiv.appendChild(bubbleContainer);

        // Add explanation if provided (on a separate line)
        if (explanation && explanation.trim()) {
            const explanationDiv = document.createElement('div');
            explanationDiv.className = 'explanation';
            explanationDiv.textContent = explanation;
            correctionDiv.appendChild(explanationDiv);
        }

        messagesContainer.appendChild(correctionDiv);
    }

    makeWordsClickable(text, translations) {
        let html = text;

        // Sort words by length (longest first) to avoid partial replacements
        const words = Object.keys(translations).sort((a, b) => b.length - a.length);

        // Helper to escape HTML for attribute values
        function escapeHtmlAttr(str) {
            return str.replace(/&/g, '&amp;')
                      .replace(/"/g, '&quot;')
                      .replace(/'/g, '&#39;')
                      .replace(/</g, '&lt;')
                      .replace(/>/g, '&gt;');
        }

        words.forEach(word => {
            const regex = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'giu');
            html = html.replace(
                regex,
                `<span class="clickable-word" data-word="${escapeHtmlAttr(word.toLowerCase())}">$&</span>`
            );
        });

        return html;
    }

    showSuggestedWords(words) {
        const container = document.getElementById('suggested-words');

        if (words.length === 0) {
            container.classList.add('hidden');
            this.adjustChatContainerPadding();
            return;
        }

        container.innerHTML = '';
        words.forEach(word => {
            const wordSpan = document.createElement('span');
            wordSpan.className = 'suggested-word clickable-word';
            wordSpan.textContent = word;
            wordSpan.dataset.word = word.toLowerCase();
            container.appendChild(wordSpan);
        });

        container.classList.remove('hidden');
        this.adjustChatContainerPadding();
    }

    createSystemPrompt() {
        const nativeLanguageName = this.profile.nativeLanguage;
        const targetLanguageName = this.profile.targetLanguage;

        const hasConversations = this.conversations.length > 0;
        const conversationContext = hasConversations ? 
            "\n\nPrevious conversation context: We have talked before, so you can reference our previous interactions when appropriate. Continue the conversation naturally but in such a way that it feels like a new conversation with a fresh start and greeting." : 
            "\n\nThis is our first conversation. Start with a simple greeting and tell something about yourself in a way that is engaging and relevant to my interests.";

        let systemPrompt = `I have a student in ${targetLanguageName} that wants to improve their conversational skills. Can you ${hasConversations ? 'continue our conversation' : 'start a conversation with me'} about one of the topics mentioned in my profile? It should ${hasConversations ? 'build on our previous discussions and' : ''} start simple. I want you to speak in ${targetLanguageName} but want you to provide explanations in my native language ${nativeLanguageName}. I'll try to respond in ${targetLanguageName} as best as I can, but sometimes ${nativeLanguageName} might slip in. Please correct that in your explanation without highlighting that it was wrong or ${nativeLanguageName}. Always reply in ${targetLanguageName}. Please also correct my responses.

Student current level: "${this.profile.level || 'beginner'}"
Student target level: "${this.profile.targetLevel || 'conversational fluency'}"

Make sure I quickly learn the words, expressions, and phrases needed in conversation, like "yes", "no", "I don't know", "I don't understand", "sorry", "can you say that differently", greetings, goodbye, thank you, etc. With each response, include a new word or phrase in both languages. Be very engaging and conversational, as if we were having a natural chat. Do not simply answer my questions, but rather engage in a conversation that helps me learn. Tell stories, facts, ask questions, and use examples to make it interesting. Keep in mind the student's target level and gradually progress towards that goal.

My profile information:
Name: ${this.profile.name}
Native language: ${nativeLanguageName}
Target language: ${targetLanguageName}
Interests: ${this.profile.interests}
Education/Work: ${this.profile.education}
Travel: ${this.profile.travel}
Location: ${this.profile.location}${conversationContext}

Today is ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}.

Instructions for response:
- "message": Provide a corrected version of my input in the target language (if I made mistakes). When I used ${nativeLanguageName} in my response, translate it into ${targetLanguageName}.
- "explanation": Explain the corrections in ${nativeLanguageName}. Do not mention that I made mistakes, just provide the corrected version and explain why it is correct.
- "reply": Your conversational response in ${targetLanguageName}. This should be engaging and relevant to the conversation.
- "suggested": Five useful words for my next response, preferably words not already used in our prior conversation. For example, when the last reply was 'Hello, how are you?', suggest words like 'good', 'fine', 'thanks'.
- "translations": Every word from message, reply, and suggested words with ${nativeLanguageName} translations.`;

        // Append additional system prompt if provided
        if (this.profile.additionalSystemPrompt && this.profile.additionalSystemPrompt.trim()) {
            systemPrompt += `\n\nAdditional Instructions:\n${this.profile.additionalSystemPrompt.trim()}`;
        }

        return systemPrompt;
    }

    showTranslationPopup(originalWord, translatedWord) {
        document.getElementById('original-word').textContent = originalWord;
        document.getElementById('translated-word').textContent = translatedWord;
        document.getElementById('translation-popup').classList.remove('hidden');
    }

    hideTranslationPopup() {
        document.getElementById('translation-popup').classList.add('hidden');
    }

    showSystemPromptModal() {
        // Get current form values to generate the most up-to-date system prompt
        const form = document.getElementById('profile-form');
        const formData = new FormData(form);
        const currentProfile = Object.fromEntries(formData.entries());

        // Check if required fields are filled
        if (!currentProfile.nativeLanguage || !currentProfile.targetLanguage) {
            alert('Please select both your native language and target language to view the system prompt.');
            return;
        }

        // Temporarily use current form values to generate system prompt
        const originalProfile = this.profile;
        this.profile = { ...this.profile, ...currentProfile };
        
        // Get the current system prompt
        const systemPrompt = this.createSystemPrompt();
        
        // Restore original profile
        this.profile = originalProfile;
        
        // Display it in the modal
        document.getElementById('system-prompt-text').textContent = systemPrompt;
        document.getElementById('system-prompt-modal').classList.remove('hidden');
    }

    hideSystemPromptModal() {
        document.getElementById('system-prompt-modal').classList.add('hidden');
    }

    showConversationHistoryModal() {
        if (!this.conversations || this.conversations.length === 0) {
            alert('No conversation history to display.');
            return;
        }

        // Generate HTML for conversation history
        const historyContent = this.generateConversationHistoryHTML();
        
        // Display it in the modal
        document.getElementById('conversation-history-content').innerHTML = historyContent;
        document.getElementById('conversation-history-modal').classList.remove('hidden');
    }

    hideConversationHistoryModal() {
        document.getElementById('conversation-history-modal').classList.add('hidden');
    }

    generateConversationHistoryHTML() {
        let html = '';
        
        this.conversations.forEach((conv, index) => {
            html += `<div class="history-conversation">`;
            html += `<div class="history-message-label">Exchange ${index + 1}</div>`;
            
            // Student message
            if (conv.studentMessage && conv.studentMessage.trim()) {
                html += `<div class="history-message student">`;
                html += `<div class="history-message-label">You said:</div>`;
                html += `<div>${this.escapeHtml(conv.studentMessage)}</div>`;
                html += `</div>`;
                
                // Corrected message if different
                if (conv.correctedMessage && conv.correctedMessage.trim() !== conv.studentMessage.trim()) {
                    html += `<div class="history-message correction">`;
                    html += `<div class="history-message-label">Corrected:</div>`;
                    html += `<div>${this.escapeHtml(conv.correctedMessage)}</div>`;
                    if (conv.explanation && conv.explanation.trim()) {
                        html += `<div class="history-explanation">${this.escapeHtml(conv.explanation)}</div>`;
                    }
                    html += `</div>`;
                }
            }
            
            // Teacher reply
            if (conv.teacherReply && conv.teacherReply.trim()) {
                html += `<div class="history-message teacher">`;
                html += `<div class="history-message-label">Teacher replied:</div>`;
                html += `<div>${this.escapeHtml(conv.teacherReply)}</div>`;
                html += `</div>`;
            }
            
            html += `</div>`;
        });
        
        return html;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    updateTypingPreview(text) {
        const trimmedText = text.trim();
        
        if (trimmedText === '') {
            this.hideTypingPreview();
            return;
        }

        if (!this.typingPreviewBubble) {
            this.createTypingPreviewBubble();
        }

        this.typingPreviewBubble.querySelector('.message-bubble').textContent = trimmedText;
        setTimeout(() => {
            this.adjustChatContainerPadding();
        }, 50);
    }

    createTypingPreviewBubble() {
        const messagesContainer = document.getElementById('messages');
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message student typing-preview';
        messageDiv.style.opacity = '0.6';

        const bubbleDiv = document.createElement('div');
        bubbleDiv.className = 'message-bubble';
        
        messageDiv.appendChild(bubbleDiv);
        messagesContainer.appendChild(messageDiv);
        
        this.typingPreviewBubble = messageDiv;
    }

    hideTypingPreview() {
        if (this.typingPreviewBubble) {
            this.typingPreviewBubble.remove();
            this.typingPreviewBubble = null;
            setTimeout(() => {
                this.adjustChatContainerPadding();
            }, 50);
        }
    }

    showThinkingBubble() {
        if (this.thinkingBubble) return;

        const messagesContainer = document.getElementById('messages');
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message teacher thinking-bubble';

        const bubbleDiv = document.createElement('div');
        bubbleDiv.className = 'message-bubble';
        bubbleDiv.innerHTML = '<div class="thinking-animation"><span>•</span><span>•</span><span>•</span></div>';
        
        messageDiv.appendChild(bubbleDiv);
        messagesContainer.appendChild(messageDiv);
        
        this.thinkingBubble = messageDiv;
        setTimeout(() => {
            this.adjustChatContainerPadding();
        }, 50);
    }

    hideThinkingBubble() {
        if (this.thinkingBubble) {
            this.thinkingBubble.remove();
            this.thinkingBubble = null;
            setTimeout(() => {
                this.adjustChatContainerPadding();
            }, 50);
        }
    }

    updateSendButtonState() {
        const sendBtn = document.getElementById('send-btn');
        
        if (this.isWaitingForResponse) {
            sendBtn.disabled = true;
            sendBtn.innerHTML = '<div class="button-spinner"></div>';
        } else {
            sendBtn.disabled = false;
            sendBtn.textContent = 'Send';
        }
    }

    scrollToBottom() {
        const chatContainer = document.getElementById('chat-container');
        setTimeout(() => {
            chatContainer.scrollTop = chatContainer.scrollHeight;
        }, 50);
    }

    adjustChatContainerPadding() {
        const chatContainer = document.getElementById('chat-container');
        const inputContainer = document.getElementById('chat-input-container');
        
        // Get the actual height of the input container
        const inputContainerHeight = inputContainer.offsetHeight;
        
        // Add some extra padding for safety (20px)
        const newPaddingBottom = inputContainerHeight + 20;
        
        chatContainer.style.paddingBottom = `${newPaddingBottom}px`;
        
        // Trigger a scroll to bottom to ensure content is visible
        this.scrollToBottom();
    }

    saveConversations() {
        localStorage.setItem('babbelaar_conversations', JSON.stringify(this.conversations));
        
        // Update clear history button visibility in case this is the first conversation
        this.updateClearHistoryButtonVisibility();
    }

    saveTranslationLibrary() {
        localStorage.setItem('babbelaar_translation_library', JSON.stringify(this.translationLibrary));
    }

    updateClearHistoryButtonVisibility() {
        const viewHistoryBtn = document.getElementById('view-conversation-history-btn');
        const clearHistoryBtn = document.getElementById('clear-history-btn');
        
        // Enable/disable buttons based on whether there are conversations
        const hasConversations = this.conversations && this.conversations.length > 0;
        
        if (viewHistoryBtn) {
            viewHistoryBtn.disabled = !hasConversations;
            viewHistoryBtn.style.opacity = hasConversations ? '1' : '0.5';
        }
        
        if (clearHistoryBtn) {
            clearHistoryBtn.disabled = !hasConversations;
            clearHistoryBtn.style.opacity = hasConversations ? '1' : '0.5';
        }
    }

    clearConversationHistory() {
        // Prompt user for confirmation
        const confirmed = confirm(
            'Are you sure you want to clear your conversation history?\n\n' +
            'This will permanently delete all your previous conversations and learned translations, but will keep your profile settings.\n\n' +
            'This action cannot be undone.'
        );

        if (confirmed) {
            // Clear conversations array
            this.conversations = [];
            
            // Clear translation library
            this.translationLibrary = {};
            this.currentTranslations = {};
            
            // Clear from localStorage
            localStorage.removeItem('babbelaar_conversations');
            localStorage.removeItem('babbelaar_translation_library');
            
            // Clear the chat interface if we're currently on the chat screen
            const messagesContainer = document.getElementById('messages');
            if (messagesContainer) {
                messagesContainer.innerHTML = '';
            }
            
            // Reset conversation state
            this.hasStartedConversation = false;
            
            // Hide suggested words
            const suggestedWordsContainer = document.getElementById('suggested-words');
            if (suggestedWordsContainer) {
                suggestedWordsContainer.classList.add('hidden');
            }
            
            // Update button visibility (hide it since there's nothing to clear now)
            this.updateClearHistoryButtonVisibility();
            
            // Adjust padding after clearing
            setTimeout(() => {
                this.adjustChatContainerPadding();
            }, 100);
            
            // Show success message
            alert('Conversation history has been cleared successfully!');
        }
    }

    async generateSpeech(text, voice = 'alloy') {
        if (!this.profile.useTts || !text.trim()) {
            return null;
        }

        try {
            const ttsEndpoint = this.profile.ttsEndpoint || 'https://api.openai.com/v1/audio/speech';
            const ttsModel = this.profile.ttsModel || 'gpt-4o-mini-tts';
            const instructions = this.profile.ttsInstructions || '';

            // Prepare headers
            const headers = {
                'Content-Type': 'application/json'
            };
            
            // Add Authorization header - use dedicated TTS API key if available, otherwise fallback to main API key
            const apiKey = this.profile.ttsApiKey || this.profile.apiKey;
            if (apiKey && apiKey.trim()) {
                headers['Authorization'] = `Bearer ${apiKey}`;
            }

            // Prepare request body
            const requestBody = {
                model: ttsModel,
                input: text,
                voice: voice,
                response_format: 'mp3'
            };

            // Add instructions if provided
            if (instructions.trim()) {
                requestBody.instructions = instructions;
            }

            const response = await fetch(ttsEndpoint, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                throw new Error(`TTS API request failed: ${response.status}`);
            }

            const audioBlob = await response.blob();
            return URL.createObjectURL(audioBlob);
        } catch (error) {
            console.error('Error generating speech:', error);
            return null;
        }
    }

    async playAudio(audioUrl, playingButton = null) {
        if (!audioUrl) return;

        return new Promise((resolve) => {
            if (this.currentAudio) {
                this.currentAudio.pause();
                this.currentAudio = null;
            }

            const audio = new Audio(audioUrl);
            this.currentAudio = audio;
            this.isPlayingAudio = true;
            this.currentPlayingButton = playingButton;

            // Update button to show it's playing
            if (playingButton) {
                playingButton.className = 'stop-button';
                playingButton.innerHTML = '⏹';
                playingButton.title = 'Stop audio';
            }

            audio.onended = () => {
                this.isPlayingAudio = false;
                this.currentAudio = null;
                this.currentPlayingButton = null;
                URL.revokeObjectURL(audioUrl);
                
                // Reset button
                if (playingButton) {
                    playingButton.className = 'play-button';
                    playingButton.innerHTML = '▶';
                    playingButton.title = 'Play audio';
                }
                
                resolve();
            };

            audio.onerror = () => {
                this.isPlayingAudio = false;
                this.currentAudio = null;
                this.currentPlayingButton = null;
                URL.revokeObjectURL(audioUrl);
                
                // Reset button
                if (playingButton) {
                    playingButton.className = 'play-button';
                    playingButton.innerHTML = '▶';
                    playingButton.title = 'Play audio';
                }
                
                resolve();
            };

            audio.play().catch((error) => {
                console.error('Error playing audio:', error);
                this.isPlayingAudio = false;
                this.currentAudio = null;
                this.currentPlayingButton = null;
                URL.revokeObjectURL(audioUrl);
                
                // Reset button
                if (playingButton) {
                    playingButton.className = 'play-button';
                    playingButton.innerHTML = '▶';
                    playingButton.title = 'Play audio';
                }
                
                resolve();
            });
        });
    }

    stopAudio() {
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio = null;
            this.isPlayingAudio = false;
        }
        
        // Reset the currently playing button
        if (this.currentPlayingButton) {
            this.currentPlayingButton.className = 'play-button';
            this.currentPlayingButton.innerHTML = '▶';
            this.currentPlayingButton.title = 'Play audio';
            this.currentPlayingButton = null;
        }
    }

    async playSequentially(audioQueue) {
        for (const audioData of audioQueue) {
            if (audioData && audioData.url) {
                await this.playAudio(audioData.url, audioData.button);
            }
        }
    }

    createPlayButton(text, voice, containerId) {
        const button = document.createElement('button');
        button.className = 'play-button';
        button.innerHTML = '▶';
        button.title = 'Play audio';
        
        button.onclick = async (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            // If this button is currently playing, stop it
            if (this.currentPlayingButton === button) {
                this.stopAudio();
                return;
            }
            
            // If any other audio is playing, stop it first
            if (this.isPlayingAudio) {
                this.stopAudio();
            }

            // Show loading state
            button.className = 'loading-button';
            button.innerHTML = '<span class="hourglass">⏳</span>';
            button.title = 'Loading audio...';
            button.disabled = true;
            this.loadingButtons.add(button);
            
            try {
                const audioUrl = await this.generateSpeech(text, voice);
                if (audioUrl) {
                    // Remove loading state
                    this.loadingButtons.delete(button);
                    button.disabled = false;
                    
                    await this.playAudio(audioUrl, button);
                } else {
                    // Reset button on error
                    this.loadingButtons.delete(button);
                    button.className = 'play-button';
                    button.innerHTML = '▶';
                    button.title = 'Play audio';
                    button.disabled = false;
                }
            } catch (error) {
                // Reset button on error
                this.loadingButtons.delete(button);
                button.className = 'play-button';
                button.innerHTML = '▶';
                button.title = 'Play audio';
                button.disabled = false;
                console.error('Error generating speech:', error);
            }
        };
        
        return button;
    }

    getLanguageCode(languageName) {
        const languageMap = {
            'Albanian': 'sq',
            'Arabic': 'ar',
            'Armenian': 'hy',
            'Awadhi': 'awa',
            'Azerbaijani': 'az',
            'Bashkir': 'ba',
            'Basque': 'eu',
            'Belarusian': 'be',
            'Bengali': 'bn',
            'Bhojpuri': 'bho',
            'Bosnian': 'bs',
            'Brazilian Portuguese': 'pt',
            'Bulgarian': 'bg',
            'Cantonese (Yue)': 'yue',
            'Catalan': 'ca',
            'Chhattisgarhi': 'hne',
            'Chinese': 'zh',
            'Croatian': 'hr',
            'Czech': 'cs',
            'Danish': 'da',
            'Dogri': 'doi',
            'Dutch': 'nl',
            'English': 'en',
            'Estonian': 'et',
            'Faroese': 'fo',
            'Finnish': 'fi',
            'French': 'fr',
            'Galician': 'gl',
            'Georgian': 'ka',
            'German': 'de',
            'Greek': 'el',
            'Gujarati': 'gu',
            'Haryanvi': 'bgc',
            'Hindi': 'hi',
            'Hungarian': 'hu',
            'Icelandic': 'is',
            'Indonesian': 'id',
            'Irish': 'ga',
            'Italian': 'it',
            'Japanese': 'ja',
            'Javanese': 'jv',
            'Kannada': 'kn',
            'Kashmiri': 'ks',
            'Kazakh': 'kk',
            'Konkani': 'kok',
            'Korean': 'ko',
            'Kyrgyz': 'ky',
            'Latvian': 'lv',
            'Lithuanian': 'lt',
            'Macedonian': 'mk',
            'Maithili': 'mai',
            'Malay': 'ms',
            'Maltese': 'mt',
            'Mandarin Chinese': 'zh',
            'Marathi': 'mr',
            'Marwari': 'mwr',
            'Min Nan': 'nan',
            'Moldovan': 'ro',
            'Mongolian': 'mn',
            'Montenegrin': 'cnr',
            'Nepali': 'ne',
            'Norwegian': 'no',
            'Oriya': 'or',
            'Pashto': 'ps',
            'Persian (Farsi)': 'fa',
            'Polish': 'pl',
            'Portuguese': 'pt',
            'Punjabi': 'pa',
            'Rajasthani': 'raj',
            'Romanian': 'ro',
            'Russian': 'ru',
            'Sanskrit': 'sa',
            'Santali': 'sat',
            'Serbian': 'sr',
            'Sindhi': 'sd',
            'Sinhala': 'si',
            'Slovak': 'sk',
            'Slovene': 'sl',
            'Slovenian': 'sl',
            'Spanish': 'es',
            'Swahili': 'sw',
            'Swedish': 'sv',
            'Tagalog': 'tl',
            'Tajik': 'tg',
            'Tamil': 'ta',
            'Tatar': 'tt',
            'Telugu': 'te',
            'Thai': 'th',
            'Turkish': 'tr',
            'Turkmen': 'tk',
            'Ukrainian': 'uk',
            'Urdu': 'ur',
            'Uzbek': 'uz',
            'Vietnamese': 'vi',
            'Welsh': 'cy',
            'Wu': 'wuu'
        };
        
        return languageMap[languageName] || 'en'; // Default to English if language not found
    }

    async initializeMicrophone() {
        if (this.microphoneStream || this.microphonePermissionGranted) {
            return true; // Already initialized
        }

        try {
            this.microphoneStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.microphonePermissionGranted = true;
            return true;
        } catch (error) {
            console.error('Error accessing microphone:', error);
            let errorMessage = 'Could not access microphone. ';
            if (error.name === 'NotAllowedError') {
                errorMessage += 'Please allow microphone access and try again.';
            } else if (error.name === 'NotFoundError') {
                errorMessage += 'No microphone found on your device.';
            } else {
                errorMessage += 'Please check your microphone settings and try again.';
            }
            alert(errorMessage);
            return false;
        }
    }

    cleanupMicrophone() {
        if (this.microphoneStream) {
            this.microphoneStream.getTracks().forEach(track => track.stop());
            this.microphoneStream = null;
            this.microphonePermissionGranted = false;
        }
    }

    async toggleSpeechRecognition() {
        if (!this.profile.useStt) {
            return;
        }

        if (this.isRecording) {
            this.stopRecording();
        } else {
            await this.startRecording();
        }
    }

    async startRecording() {
        // Ensure microphone is initialized
        const microphoneReady = await this.initializeMicrophone();
        if (!microphoneReady) {
            this.resetRecordingUI();
            return;
        }

        try {
            // Check for MediaRecorder support and audio format compatibility
            const options = [];
            if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
                options.push({ mimeType: 'audio/webm;codecs=opus' });
            } else if (MediaRecorder.isTypeSupported('audio/webm')) {
                options.push({ mimeType: 'audio/webm' });
            } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
                options.push({ mimeType: 'audio/mp4' });
            }
            
            this.mediaRecorder = new MediaRecorder(this.microphoneStream, options[0] || {});
            this.audioChunks = [];
            this.isRecording = true;

            const micBtn = document.getElementById('mic-btn');
            const messageInput = document.getElementById('message-input');
            
            micBtn.classList.add('recording');
            micBtn.textContent = '⏹️';
            messageInput.disabled = true;
            messageInput.placeholder = 'Recording... Click the stop button when finished';

            this.mediaRecorder.ondataavailable = (event) => {
                this.audioChunks.push(event.data);
            };

            this.mediaRecorder.onstop = async () => {
                const mimeType = this.mediaRecorder.mimeType || 'audio/webm';
                const audioBlob = new Blob(this.audioChunks, { type: mimeType });
                await this.transcribeAudio(audioBlob);
                
                // Don't stop the stream - keep it alive for future recordings
                this.resetRecordingUI();
            };

            this.mediaRecorder.start();
        } catch (error) {
            console.error('Error starting recording:', error);
            alert('Error starting recording. Please try again.');
            this.resetRecordingUI();
        }
    }

    stopRecording() {
        if (this.mediaRecorder && this.isRecording) {
            this.mediaRecorder.stop();
            this.isRecording = false;
        }
    }

    resetRecordingUI() {
        const micBtn = document.getElementById('mic-btn');
        const messageInput = document.getElementById('message-input');
        
        micBtn.classList.remove('recording');
        micBtn.textContent = '🎤';
        messageInput.disabled = false;
        messageInput.placeholder = 'Type your message...';
        this.isRecording = false;
    }

    async transcribeAudio(audioBlob) {
        const messageInput = document.getElementById('message-input');
        messageInput.placeholder = 'Transcribing speech...';

        try {
            const formData = new FormData();
            
            // Convert blob to appropriate format for OpenAI API
            const fileName = audioBlob.type.includes('webm') ? 'audio.webm' : 'audio.wav';
            formData.append('file', audioBlob, fileName);
            formData.append('model', this.profile.sttModel || 'whisper-1');
            formData.append('response_format', 'text');
            
            // Use the target language from user's profile for better accuracy
            const languageCode = this.getLanguageCode(this.profile.targetLanguage);
            formData.append('language', languageCode); // Supplying the input language in ISO-639-1 format improves accuracy and latency

            const apiKey = this.profile.sttApiKey || this.profile.apiKey;
            const endpoint = this.profile.sttEndpoint || 'https://api.openai.com/v1/audio/transcriptions';

            if (!apiKey) {
                throw new Error('No API key provided for speech-to-text');
            }

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`
                },
                body: formData
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
            }

            const transcription = await response.text();
            const trimmedTranscription = transcription.trim();

            if (trimmedTranscription) {
                messageInput.value = trimmedTranscription;
                
                // Auto-send if enabled
                if (this.profile.autoSendSpeech) {
                    this.sendMessage();
                } else {
                    messageInput.focus();
                }
            } else {
                messageInput.placeholder = 'No speech detected. Try speaking more clearly.';
                setTimeout(() => {
                    messageInput.placeholder = 'Type your message...';
                }, 3000);
            }
        } catch (error) {
            console.error('Error transcribing audio:', error);
            let errorMessage = 'Error transcribing speech. ';
            if (error.message.includes('401')) {
                errorMessage += 'Invalid API key.';
            } else if (error.message.includes('429')) {
                errorMessage += 'Rate limit exceeded. Please try again later.';
            } else {
                errorMessage += 'Please try again.';
            }
            messageInput.placeholder = errorMessage;
            setTimeout(() => {
                messageInput.placeholder = 'Type your message...';
            }, 3000);
        }
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const app = new Babbelaar();

    // Handle word clicks for translations
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('clickable-word')) {
            const word = e.target.dataset.word;
            const originalText = e.target.textContent;

            // Check in translation library first, then fallback to current translations
            if (app.translationLibrary[word]) {
                app.showTranslationPopup(originalText, app.translationLibrary[word]);
            } else if (app.translationLibrary[originalText.toLowerCase()]) {
                app.showTranslationPopup(originalText, app.translationLibrary[originalText.toLowerCase()]);
            } else if (app.currentTranslations[word]) {
                app.showTranslationPopup(originalText, app.currentTranslations[word]);
            } else if (app.currentTranslations[originalText.toLowerCase()]) {
                app.showTranslationPopup(originalText, app.currentTranslations[originalText.toLowerCase()]);
            }
        }

        // Handle suggested word clicks
        if (e.target.classList.contains('suggested-word')) {
            const input = document.getElementById('message-input');
            const currentValue = input.value;
            const wordToAdd = e.target.textContent;

            if (currentValue.trim()) {
                input.value = currentValue + ' ' + wordToAdd;
            } else {
                input.value = wordToAdd;
            }

            input.focus();
        }
    });
});
