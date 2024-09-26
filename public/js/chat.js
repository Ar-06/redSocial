document.addEventListener('DOMContentLoaded', async () => {
    const socket = io();
    const chatForm = document.getElementById('chat-form');
    const chatMessages = document.getElementById('chat-messages');
    const chatInput = document.getElementById('chat-input');
    const recordBtn = document.getElementById('record-btn');
    const urlParams = new URLSearchParams(window.location.search);
    const chatId = urlParams.get('chatId'); // Obtener el chatId de la URL
    let userName;

    try {
        const response = await fetch('/usuario');
        if (response.ok) {
            const user = await response.json();
            userName = `${user.nombre} ${user.apellido}`;
        } else {
            alert('Error al obtener los datos del usuario');
            return;
        }
    } catch (error) {
        alert('Error al obtener los datos del usuario: ' + error.message);
        return;
    }

    let mediaRecorder;
    let audioChunks = [];

    // Unirse a la sala del chat
    socket.emit('join chat', chatId);

    chatForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const message = {
            user: userName,
            text: chatInput.value,
            chatId: chatId, // Ajusta esto según el chat actual
            type: 'text'
        };

        socket.emit('chat message', message);

        chatInput.value = '';
    });

    socket.on('chat message', (msg) => {
        const newMessage = document.createElement('div');
        newMessage.classList.add('chat-message');
        if (msg.type === 'audio') {
            const audio = document.createElement('audio');
            audio.controls = true;
            audio.src = `data:audio/wav;base64,${msg.audio}`;
            newMessage.appendChild(audio);
        } else {
            newMessage.innerText = `${msg.user}: ${msg.text}`;
        }

        if (msg.user === userName) {
            newMessage.classList.add('user');
        } else {
            newMessage.classList.add('other');
        }

        chatMessages.appendChild(newMessage);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    });

    recordBtn.addEventListener('click', () => {
        if (recordBtn.textContent.includes('Grabar Audio')) {
            startRecording();
        } else {
            stopRecording();
        }
    });

    function startRecording() {
        navigator.mediaDevices.getUserMedia({ audio: true })
            .then(stream => {
                mediaRecorder = new MediaRecorder(stream);
                mediaRecorder.start();
                recordBtn.innerHTML = 'Detener Grabación';

                mediaRecorder.ondataavailable = (e) => {
                    audioChunks.push(e.data);
                };

                mediaRecorder.onstop = () => {
                    const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
                    const reader = new FileReader();
                    reader.readAsDataURL(audioBlob);
                    reader.onloadend = () => {
                        const base64String = reader.result.split(',')[1];
                        const message = {
                            user: userName,
                            audio: base64String,
                            chatId: chatId, // Ajusta esto según el chat actual
                            type: 'audio'
                        };
                        socket.emit('chat message', message);
                        audioChunks = [];
                    };
                };
            })
            .catch(err => console.log('El acceso a la grabadora fue denegado', err));
    }

    function stopRecording() {
        mediaRecorder.stop();
        recordBtn.innerHTML = 'Grabar Audio';
    }

    // Cargar mensajes existentes al iniciar el chat
    fetch(`/messages/${chatId}`)
        .then(response => response.json())
        .then(messages => {
            chatMessages.innerHTML = ''; // Limpia el contenedor de mensajes
            messages.forEach(msg => {
                const newMessage = document.createElement('div');
                newMessage.classList.add('chat-message');
                if (msg.type === 'audio') {
                    const audio = document.createElement('audio');
                    audio.controls = true;
                    audio.src = `data:audio/wav;base64,${msg.audio}`;
                    newMessage.appendChild(audio);
                } else {
                    newMessage.innerText = `${msg.user}: ${msg.text}`;
                }

                if (msg.user === userName) {
                    newMessage.classList.add('user');
                } else {
                    newMessage.classList.add('other');
                }

                chatMessages.appendChild(newMessage);
            });
            chatMessages.scrollTop = chatMessages.scrollHeight;
        });
});
