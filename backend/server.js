const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const axios = require('axios');

const app = express();
const PORT = 3000;

// Connexion à MongoDB
mongoose.connect('mongodb://localhost:27017/streamlitDB', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Schéma utilisateur
const userSchema = new mongoose.Schema({
  nom: String,
  email: { type: String, unique: true },
  mot_de_passe_hash: String,
  date_inscription: { type: Date, default: Date.now },
});

const User = mongoose.model('User', userSchema);

// Middleware
app.use(bodyParser.json());
app.use(cors({
  origin: 'http://localhost:4200', // Autorise les requêtes depuis Angular
  methods: ['GET', 'POST', 'PUT', 'DELETE'], // Autorise les méthodes HTTP
  allowedHeaders: ['Content-Type', 'Authorization'] // Autorise les en-têtes
}));

// Route pour l'inscription
app.post('/api/auth/register', async (req, res) => {
  const { nom, email, mot_de_passe } = req.body;

  // Vérifier si l'email est déjà utilisé
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(400).json({ message: 'Cet email est déjà utilisé.' });
  }

  // Hasher le mot de passe
  const mot_de_passe_hash = await bcrypt.hash(mot_de_passe, 10);

  // Créer un nouvel utilisateur
  const newUser = new User({ nom, email, mot_de_passe_hash });
  await newUser.save();

  res.status(201).json({ message: 'Inscription réussie.', user: newUser });
});

// Route pour la connexion
app.post('/api/auth/login', async (req, res) => {
  const { email, mot_de_passe } = req.body;

  // Trouver l'utilisateur par email
  const user = await User.findOne({ email });
  if (!user) {
    return res.status(400).json({ message: 'Email incorrect.' });
  }

  // Vérifier le mot de passe
  const isPasswordValid = await bcrypt.compare(mot_de_passe, user.mot_de_passe_hash);
  if (!isPasswordValid) {
    return res.status(400).json({ message: 'Mot de passe incorrect.' });
  }

  res.status(200).json({ message: 'Connexion réussie.', user });
});

// Route pour générer un quiz
app.post('/api/quiz/generate', async (req, res) => {
  const { niveau, matiere, sous_sujet, nombre_questions } = req.body;

  const prompt = `
    Tu es un professeur spécialisé en ${matiere} pour le niveau ${niveau}.  
    Le sous-sujet actuel est : ${sous_sujet}.
    Ton objectif est de générer ${nombre_questions} questions adaptées à ce niveau et à ce sous-sujet.  

    **Règles à suivre :**  
    1. Les questions doivent être en français.  
    2. Si tu fais référence à une image ou à un élément visuel, décris-le textuellement.  
    3. Chaque question doit être claire, concise et adaptée au niveau spécifié.  
    4. Formate chaque question comme suit :  
       - "Q1: [énoncé de la question] ?"  
       - "Q2: [énoncé de la question] ?"  
       - "Q3: [énoncé de la question] ?"  
       - ...  
    5. **Ne montre pas ton processus de réflexion. Va directement aux questions.**  
    6. Arrête-toi exactement après avoir généré le nombre de questions demandé (${nombre_questions}).  
    7. Ne dépasse pas le nombre de questions demandé.  
  `;

  try {
    const response = await axios.post('http://localhost:11434/api/generate', {
      model: 'deepseek-r1:14b',
      prompt: prompt,
      stream: false,
      options: {
        temperature: 0.7,
        top_p: 0.9,
        num_predict: 5000
      }
    });

    const questions = response.data.response.split('\n').filter(q => q.trim().startsWith('Q') && q.includes('?'));
    res.status(200).json({ questions });
  } catch (error) {
    console.error('Erreur lors de la génération du quiz :', error);
    res.status(500).json({ message: 'Erreur lors de la génération du quiz.' });
  }
});






app.post('/api/quiz/feedback', async (req, res) => {
  const { questions, reponses_utilisateur } = req.body;

  const feedback_prompt = `
    🎯 **Règles :**
    - Tu es un assistant d'école primaire.
    - **Réponds uniquement en français**.
    - Pour chaque question :
    1. Si la réponse est correcte → Félicite.
    2. Si la réponse est incorrecte → Explique en termes simples et identifie la lacune de l'élève.
    3. Pas de préambule comme "Alright, Let's..." ou "Bon, je dois..."
    4. Ne montre pas ton processus de réflexion interne.
    5. Ne montre pas la balise "<think>...</think>"
    6. Va directement aux corrections ou félicitations.
  `;

  // Ajouter les questions et réponses de l'utilisateur au prompt
  feedback_prompt += "Voici les réponses d'un élève :\n";
  for (let i = 0; i < questions.length; i++) {
    feedback_prompt += `${questions[i]}\nRéponse de l'élève: ${reponses_utilisateur[i]}\n`;
  }

  try {
    const response = await axios.post('http://localhost:11434/api/generate', {
      model: 'deepseek-r1:14b',
      prompt: feedback_prompt,
      stream: false,
      options: {
        temperature: 0.7,
        top_p: 0.9,
        num_predict: 5000
      }
    });

    const feedback = response.data.response;
    res.status(200).json({ feedback });
  } catch (error) {
    console.error('Erreur lors de la génération du feedback :', error);
    res.status(500).json({ message: 'Erreur lors de la génération du feedback.' });
  }
});







// Démarrer le serveur
app.listen(PORT, () => {
  console.log(`Serveur backend en cours d'exécution sur http://localhost:${PORT}`);
});


