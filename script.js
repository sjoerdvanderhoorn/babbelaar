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
    }

    showProfileScreen() {
        document.getElementById('profile-screen').classList.remove('hidden');
        document.getElementById('chat-screen').classList.add('hidden');

        if (this.profile) {
            this.populateProfileForm();
        }
        
        // Update clear history button visibility
        this.updateClearHistoryButtonVisibility();
    }

    showChatScreen() {
        document.getElementById('profile-screen').classList.add('hidden');
        document.getElementById('chat-screen').classList.remove('hidden');
        
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

    populateProfileForm() {
        const form = document.getElementById('profile-form');
        Object.keys(this.profile).forEach(key => {
            const element = form.elements[key];
            if (element) {
                element.value = this.profile[key];
            }
        });
    }

    saveProfile() {
        const formData = new FormData(document.getElementById('profile-form'));
        this.profile = Object.fromEntries(formData.entries());

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
                        "description": `Explanation in ${nativeLanguageName} about the corrected text.`
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
                        "description": `List every word from the message, reply, and suggested words in the target language, with translation to ${nativeLanguageName} for each, no matter how simple.`,
                        "additionalProperties": {
                            "type": "string"
                        }
                    }
                },
                "required": ["message", "explanation", "reply", "suggested"],
                "additionalProperties": false
            };

            const apiEndpoint = this.profile.apiEndpoint || 'https://api.openai.com/v1/chat/completions';
            const modelName = this.profile.modelName || 'gpt-4o-mini';

            const response = await fetch(apiEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.profile.apiKey}`
                },
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
            try {
                teacherResponse = JSON.parse(content);
            } catch (e) {
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

        correctionDiv.appendChild(correctedBubble);

        // Add explanation if provided
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

        words.forEach(word => {
            const regex = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
            html = html.replace(regex, `<span class="clickable-word" data-word="${word.toLowerCase()}">$&</span>`);
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
            "\n\nPrevious conversation context: We have talked before, so you can reference our previous interactions when appropriate. Continue the conversation naturally." : 
            "\n\nThis is our first conversation.";

        let systemPrompt = `I have a student in ${targetLanguageName} that wants to improve their conversational skills. Can you ${hasConversations ? 'continue our conversation' : 'start a conversation with me'} about one of the topics mentioned in my profile? It should ${hasConversations ? 'build on our previous discussions and' : ''} start simple. I want you to speak in ${targetLanguageName} but want you to provide explanations in my native language ${nativeLanguageName}. I'll try to respond in ${targetLanguageName} as best as I can, but sometimes ${nativeLanguageName} might slip in. Please correct that in your explanation without highlighting that it was wrong or ${nativeLanguageName}. Always reply in ${targetLanguageName}. Please also correct my responses.

Student level: "${this.profile.level || 'beginner'}"

Make sure I quickly learn the words, expressions, and phrases needed in conversation, like "yes", "no", "I don't know", "I don't understand", "sorry", "can you say that differently", greetings, goodbye, thank you, etc. With each response, include a new word or phrase in both languages. Be very engaging and conversational, as if we were having a natural chat. Do not simply answer my questions, but rather engage in a conversation that helps me learn. Tell stories, facts, ask questions, and use examples to make it interesting.

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
        const conversationHistoryContainer = document.getElementById('conversation-history-container');
        const clearHistoryContainer = document.getElementById('clear-history-container');
        
        // Show buttons only if there are conversations to view/clear
        if (this.conversations && this.conversations.length > 0) {
            conversationHistoryContainer.style.display = 'block';
            clearHistoryContainer.style.display = 'block';
        } else {
            conversationHistoryContainer.style.display = 'none';
            clearHistoryContainer.style.display = 'none';
        }
    }

    clearConversationHistory() {
        // Prompt user for confirmation
        const confirmed = confirm(
            'Are you sure you want to clear your conversation history?\n\n' +
            'This will permanently delete all your previous conversations, but will keep your profile settings.\n\n' +
            'This action cannot be undone.'
        );

        if (confirmed) {
            // Clear conversations array
            this.conversations = [];
            
            // Clear from localStorage
            localStorage.removeItem('babbelaar_conversations');
            
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
