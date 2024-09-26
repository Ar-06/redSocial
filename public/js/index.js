document.addEventListener('DOMContentLoaded', async () => {
    const socket = io();
    let currentUser;

    try {
        const response = await fetch('/usuario');
        if (response.ok) {
            currentUser = await response.json();
        } else {
            // Si la respuesta no es OK, redirigir al login
            alert('No estás autenticado. Redirigiendo al login.');
            window.location.href = '/'; // Redirige a la página de login
            return; // Detiene la ejecución del script
        }
    } catch (error) {
        alert('Error al cargar los datos del usuario. Redirigiendo al login.');
        window.location.href = '/login.html'; // Redirige a la página de login
        return;
    }

    const postForm = document.getElementById('post-form');
    const postsContainer = document.getElementById('posts-container');

    postForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const formData = new FormData(postForm);
        formData.append('user', currentUser.nombre + ' ' + currentUser.apellido); // Añadir el nombre del usuario
        const response = await fetch('/addPost', {
            method: 'POST',
            body: formData,
        });

        if (response.ok) {
            const post = await response.json();
            addPostToDOM(post);
        } else {
            alert('Error al publicar');
        }
    });

    socket.on('new post', (post) => {
        addPostToDOM(post);
    });

    function addPostToDOM(post) {
        const postElement = document.createElement('div');
        postElement.classList.add('post');
        postElement.innerHTML = `
            <img class="profile-pic" src="images/usuario.png" alt="Perfil">
            <p>${post.user}</p>
            <p>${post.text}</p>
            ${post.image ? `<img src="${post.image}" alt="Imagen de la publicación">` : ''}
            <span>${new Date(post.timestamp).toLocaleString()}</span>
            <div class="comments" id="comments-${post._id}">
                ${post.comments.map(comment => `
                    <div class="comment">
                        <p>${comment.user}: ${comment.text}</p>
                        <span>${new Date(comment.timestamp).toLocaleString()}</span>
                    </div>
                `).join('')}
            </div>
            <form class="comment-form" data-post-id="${post._id}">
                <input type="text" name="comment" placeholder="Escribe un comentario...">
                <button type="submit">Comentar</button>
            </form>
        `;
        postsContainer.prepend(postElement);

        const commentForms = document.querySelectorAll('.comment-form');
        commentForms.forEach(form => {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                const postId = form.getAttribute('data-post-id');
                const commentText = form.querySelector('input[name="comment"]').value;

                const response = await fetch(`/addComment/${postId}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ user: currentUser.nombre + ' ' + currentUser.apellido, text: commentText })
                });

                if (response.ok) {
                    const comment = await response.json();
                    addCommentToDOM(postId, comment);
                    socket.emit('new comment', { postId, comment });
                } else {
                    alert('Error al comentar');
                }
            });
        });
    }

    function addCommentToDOM(postId, comment) {
        const commentsContainer = document.getElementById(`comments-${postId}`);
        const commentElement = document.createElement('div');
        commentElement.classList.add('comment');
        commentElement.innerHTML = `
            <p>${comment.user}: ${comment.text}</p>
            <span>${new Date(comment.timestamp).toLocaleString()}</span>
        `;
        commentsContainer.appendChild(commentElement);
    }

    // Cargar publicaciones existentes al iniciar
    fetch('/posts')
        .then(response => response.json())
        .then(posts => {
            posts.forEach(post => addPostToDOM(post));
        });
});
