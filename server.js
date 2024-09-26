const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const path = require("path");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const User = require("./models/User");
const Message = require("./models/Message");
const Post = require("./models/Post");
const Chat = require("./models/Chat");
const UserPost = require("./models/UserPost");
const multer = require("multer");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Configurar Multer para manejar la subida de archivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "public/uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({ storage });

// Conectar a MongoDB
mongoose
  .connect("mongodb://localhost:27017/red_social", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("Conectado a MongoDB");
  })
  .catch((err) => {
    console.error("Error al conectar a MongoDB", err);
  });

const sessionMiddleware = session({
  secret: "mysecret",
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false },
  store: MongoStore.create({
    mongoUrl: "mongodb://localhost:27017/red_social",
  }),
});

app.use(sessionMiddleware);
app.use(express.static(path.join(__dirname, "public")));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Middleware para verificar la autenticación
function isAuthenticated(req, res, next) {
  if (req.session.user) {
    return next();
  }
  res.redirect("/login.html"); // Redirige a login si no está autenticado
}

// Ruta principal que redirige según autenticación
app.get("/login.html", (req, res) => {
  if (req.session.user) {
    res.redirect("/index"); // Redirige a index si el usuario está autenticado
  } else {
    res.sendFile(path.join(__dirname, "public", "login.html")); // Muestra login si no lo está
  }
});

// Rutas protegidas
app.get("/index", isAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/perfil", isAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "perfil.html"));
});

app.get("/messages", isAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "messages.html"));
});

// Definir rutas públicas
const publicRoutes = ["/", "/login", "/register", "/uploads"];

// Middleware para verificar autenticación
app.use((req, res, next) => {
  if (
    !req.session.user &&
    !publicRoutes.some((route) => req.path.startsWith(route))
  ) {
    return res.redirect("/login"); // Redirige a la página de inicio de sesión si no está autenticado
  }
  next();
});

app.post("/login", async (req, res) => {
  const { codigo, password } = req.body;
  const user = await User.findOne({ codigo, password });
  if (user) {
    req.session.user = user;
    res.redirect("/index");
  } else {
    res.send("Usuario o contraseña incorrectos");
  }
});

app.post("/register", async (req, res) => {
    const { nombre, apellido, codigo, password } = req.body;
    const user = new User({ nombre, apellido, codigo, password });
    try {
      await user.save();
      res.redirect("/login.html"); // Redirigir al usuario a la página de inicio de sesión
    } catch (error) {
      console.error("Error al registrar:", error);
      res.status(400).send("Error al registrar"); // Enviar un mensaje de error al cliente
    }
  });

  
app.post("/updateProfile", upload.single("profilePhoto"), async (req, res) => {
  const { nombre, apellido } = req.body;
  const codigo = req.session.user.codigo;
  const photoPath = req.file
    ? `/uploads/${req.file.filename}`
    : req.session.user.photo;

  try {
    await User.findOneAndUpdate(
      { codigo },
      { nombre, apellido, photo: photoPath }
    );
    req.session.user.nombre = nombre;
    req.session.user.apellido = apellido;
    req.session.user.photo = photoPath;
    res.status(200).json({ message: "Perfil actualizado" });
  } catch (error) {
    res.status(500).json({ error: "Error al actualizar el perfil" });
  }
});

app.post("/createChat", async (req, res) => {
  const { user1, user2 } = req.body;

  try {
    const user1Data = await User.findOne({ codigo: user1 });
    const user2Data = await User.findOne({ codigo: user2 });

    if (!user1Data || !user2Data) {
      return res
        .status(400)
        .json({ error: "Uno o ambos usuarios no encontrados" });
    }

    let chat = await Chat.findOne({
      users: { $all: [user1Data._id, user2Data._id] },
    });

    if (!chat) {
      chat = new Chat({ users: [user1Data._id, user2Data._id] });
      await chat.save();
    }

    res.status(200).json(chat);
  } catch (error) {
    console.error("Error al crear el chat:", error);
    res.status(500).json({ error: "Error al crear el chat" });
  }
});

app.post("/addMessage", async (req, res) => {
  const { chatId, user, text, type } = req.body;
  const message = new Message({ chat: chatId, user, text, type });
  try {
    await message.save();
    res.status(200).send("Mensaje guardado");
  } catch (error) {
    res.status(500).send("Error al guardar el mensaje");
  }
});

app.get("/buscar", isAuthenticated, async (req, res) => {
  const codigo = req.query.codigo;
  const user = await User.findOne({ codigo });
  if (user) {
    req.session.viewedUser = user;
    res.redirect("/perfil?codigo=" + codigo);
  } else {
    res.send("Usuario no encontrado");
  }
});

app.get("/perfil/:codigo", isAuthenticated, async (req, res) => {
  const codigo = req.params.codigo;
  const user = await User.findOne({ codigo });
  if (user) {
    req.session.user = user;
    res.sendFile(path.join(__dirname, "public", "perfil.html"));
  } else {
    res.status(404).send("Usuario no encontrado");
  }
});

app.get("/usuario", isAuthenticated, (req, res) => {
  const codigo = req.query.codigo;
  if (codigo) {
    res.json(req.session.viewedUser);
  } else if (req.session.user) {
    res.json(req.session.user);
  } else {
    res.status(404).send("Usuario no encontrado");
  }
});

app.get("/currentUser", (req, res) => {
  if (req.session.user) {
    res.json(req.session.user);
  } else {
    res.status(404).send("Usuario no encontrado");
  }
});

app.post(
  "/addPost",
  isAuthenticated,
  upload.single("image"),
  async (req, res) => {
    const user = req.session.user;
    const text = req.body.text;
    const image = req.file ? `/uploads/${req.file.filename}` : null;
    const category = req.body.category || "General";
    const post = new Post({
      user: `${user.nombre} ${user.apellido}`,
      text,
      image,
      photo: `${user.photo}`,
    });

    await post.save();
    io.emit("new post", post);
    res.json(post);
  }
);

app.post(
  "/addUserPost",
  isAuthenticated,
  upload.single("image"),
  async (req, res) => {
    const user = req.session.user;
    const text = req.body.text;
    const image = req.file ? `/uploads/${req.file.filename}` : null;
    const userPhoto = user.photo;
    const userPost = new UserPost({
      user: user._id,
      userPhoto: userPhoto,
      text,
      image,
    });
    await userPost.save();
    res.json(userPost);
  }
);

app.get("/emprendimientos-posts", isAuthenticated, async (req, res) => {
  try {
    const posts = await Post.find({ category: "Emprendimientos" }).sort({
      createdAt: -1,
    });
    res.json(posts);
  } catch (error) {
    res.status(500).send(error);
  }
});

app.get("/getUserPosts/:userId", isAuthenticated, async (req, res) => {
  const userId = req.params.userId;
  const userPosts = await UserPost.find({ user: userId }).sort({
    timestamp: -1,
  });
  res.json(userPosts);
});

app.get("/getPosts", isAuthenticated, async (req, res) => {
  const category = req.query.category;
  const query = category ? { category } : {};
  const posts = await Post.find(query).sort({ timestamp: -1 });
  res.json(posts);
});

app.post("/addComment/:postId", isAuthenticated, async (req, res) => {
  const { postId } = req.params;
  const user = req.session.user;
  const text = req.body.text;

  const post = await Post.findById(postId);
  if (post) {
    const comment = {
      user: `${user.nombre} ${user.apellido}`,
      text,
      timestamp: new Date(),
    };
    post.comments.push(comment);
    await post.save();
    res.json(comment);
  } else {
    res.status(404).send("Publicación no encontrada");
  }
});

app.get("/messages/:chat", isAuthenticated, async (req, res) => {
  const chat = req.params.chat;
  const messages = await Message.find({ chat });
  res.json(messages);
});

app.get("/getChats/:userId", isAuthenticated, async (req, res) => {
  try {
    const userId = req.params.userId;
    const chats = await Chat.find({ users: userId }).populate("users");
    res.json(chats);
  } catch (error) {
    console.error("Error al obtener los chats:", error);
    res.status(500).send("Error al obtener los chats");
  }
});

app.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).send("Error al cerrar sesión");
    }
    res.redirect("/");
  });
});

app.post("/updateAboutMe", isAuthenticated, async (req, res) => {
  const { aboutMe } = req.body;
  const codigo = req.session.user.codigo;

  try {
    await User.findOneAndUpdate({ codigo }, { aboutMe });
    req.session.user.aboutMe = aboutMe; // Actualiza la sesión con el nuevo "Sobre mí"
    res.status(200).send('Información "Sobre mí" actualizada');
  } catch (error) {
    res.status(500).send('Error al actualizar la información "Sobre mí"');
  }
});

// Configurar Socket.IO para usar la sesión de Express
io.use((socket, next) => {
  sessionMiddleware(socket.request, {}, next);
});

io.on("connection", (socket) => {
  const user = socket.request.session.user;
  if (!user) {
    console.error("Usuario no autenticado conectado al socket");
    socket.disconnect();
  } else {
    console.log("Nuevo usuario conectado:", user.nombre);

    socket.on("join chat", (chat) => {
      socket.join(chat);
    });

    socket.on("chat message", async (msg) => {
      if (user) {
        const message = {
          chat: msg.chatId,
          user: `${user.nombre} ${user.apellido}`,
          text: msg.text,
          type: msg.type,
          timestamp: new Date(),
        };
        await new Message(message).save();
        io.to(msg.chatId).emit("chat message", message);
      } else {
        console.error("Usuario no encontrado en la sesión");
      }
    });

    socket.on("new comment", ({ postId, comment }) => {
      io.emit("new comment", { postId, comment });
    });

    socket.on("disconnect", () => {
      console.log("Usuario desconectado");
    });
  }
});

const PORT = process.env.PORT || 3008;
server.listen(PORT, () => {
  console.log(`Servidor escuchando en el puerto ${PORT}`);
});
