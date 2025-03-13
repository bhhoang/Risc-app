const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const axios = require('axios');
const jwt = require('jsonwebtoken'); // Ajout de JWT pour l'authentification

const app = express();
const PORT = 3000;
const JWT_SECRET = 'votre_clé_secrète_jwt'; // À remplacer par une clé plus sécurisée en production


const originalGet = app.get;
const originalPost = app.post;
const originalPut = app.put;
const originalDelete = app.delete;

// Track registered routes
const registeredRoutes = [];

app.get = function(path, ...handlers) {
  if (typeof path === 'string') {
    registeredRoutes.push({ method: 'GET', path });
  }
  return originalGet.apply(this, [path, ...handlers]);
};



app.post = function(path, ...handlers) {
  if (typeof path === 'string') {
    registeredRoutes.push({ method: 'POST', path });
  }
  return originalPost.apply(this, [path, ...handlers]);
};

app.put = function(path, ...handlers) {
  if (typeof path === 'string') {
    registeredRoutes.push({ method: 'PUT', path });
  }
  return originalPut.apply(this, [path, ...handlers]);
};

app.delete = function(path, ...handlers) {
  if (typeof path === 'string') {
    registeredRoutes.push({ method: 'DELETE', path });
  }
  return originalDelete.apply(this, [path, ...handlers]);
};

// Connexion à MongoDB
mongoose
  .connect('mongodb+srv://bhhoang:vEktNuvo2Z0qpRsE@nanikaclustor.mlolje2.mongodb.net/streamlitDB?retryWrites=true&w=majority&appName=NanikaClustor', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log('Connexion à MongoDB réussie'))
  .catch((err) => console.error('Erreur de connexion à MongoDB:', err));

// Schéma utilisateur
const userSchema = new mongoose.Schema({
  nom: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  mot_de_passe_hash: { type: String, required: true },
  date_inscription: { type: Date, default: Date.now },
  derniere_connexion: { type: Date },
  niveau_scolaire: { type: String, default: 'CP' },
  role: { type: String, enum: ['élève', 'parent', 'enseignant'], default: 'élève' }
});

// Schéma quiz (historique)
const quizSchema = new mongoose.Schema({
  utilisateur_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  niveau: { type: String, required: true },
  matiere: { type: String, required: true },
  sous_sujet: { type: String, required: true },
  questions: [{ type: String }],
  reponses: [{ type: String }],
  feedback: { type: String },
  score: { type: Number }, // Score calculé
  lacunes: [{ type: String }], // Compétences à améliorer identifiées
  date_creation: { type: Date, default: Date.now }
});

// Modèles
const User = mongoose.model('User', userSchema);
const Quiz = mongoose.model('Quiz', quizSchema);

// Middleware
app.use(bodyParser.json());
app.use(cors({
  origin: '*', // Autorise les requêtes depuis Angular
  methods: ['GET', 'POST', 'PUT', 'DELETE'], 
  allowedHeaders: ['Content-Type', 'Authorization'] 
}));

// Middleware d'authentification
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Token d\'authentification manquant' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Token invalide ou expiré' });
    }
    req.user = user;
    next();
  });
};

// Route pour l'inscription
app.post('/api/auth/register', async (req, res) => {
  try {
    const { nom, email, mot_de_passe } = req.body;

    // Validation des données
    if (!nom || !email || !mot_de_passe) {
      return res.status(400).json({ message: 'Tous les champs sont requis.' });
    }

    if (mot_de_passe.length < 6) {
      return res.status(400).json({ message: 'Le mot de passe doit contenir au moins 6 caractères.' });
    }

    // Vérifier si l'email est déjà utilisé
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Cet email est déjà utilisé.' });
    }

    // Hasher le mot de passe
    const mot_de_passe_hash = await bcrypt.hash(mot_de_passe, 10);

    // Créer un nouvel utilisateur
    const newUser = new User({ 
      nom, 
      email, 
      mot_de_passe_hash,
      derniere_connexion: new Date()
    });
    
    await newUser.save();

    // Générer un JWT
    const token = jwt.sign(
      { id: newUser._id, email: newUser.email, role: newUser.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Retourner les informations utilisateur sans le mot de passe
    const userResponse = {
      _id: newUser._id,
      nom: newUser.nom,
      email: newUser.email,
      niveau_scolaire: newUser.niveau_scolaire,
      role: newUser.role,
      date_inscription: newUser.date_inscription,
      token
    };

    res.status(201).json({ message: 'Inscription réussie.', user: userResponse });
  } catch (error) {
    console.error('Erreur lors de l\'inscription:', error);
    res.status(500).json({ message: 'Erreur serveur lors de l\'inscription.' });
  }
});

// Route pour la connexion
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, mot_de_passe } = req.body;

    // Validation des données
    if (!email || !mot_de_passe) {
      return res.status(400).json({ message: 'Email et mot de passe requis.' });
    }

    // Trouver l'utilisateur par email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Email ou mot de passe incorrect.' });
    }

    // Vérifier le mot de passe
    const isPasswordValid = await bcrypt.compare(mot_de_passe, user.mot_de_passe_hash);
    if (!isPasswordValid) {
      return res.status(400).json({ message: 'Email ou mot de passe incorrect.' });
    }

    // Mettre à jour la date de dernière connexion
    user.derniere_connexion = new Date();
    await user.save();

    // Générer un JWT
    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Retourner les informations utilisateur sans le mot de passe
    const userResponse = {
      _id: user._id,
      nom: user.nom,
      email: user.email,
      niveau_scolaire: user.niveau_scolaire,
      role: user.role,
      date_inscription: user.date_inscription,
      token
    };

    res.status(200).json({ message: 'Connexion réussie.', user: userResponse });
  } catch (error) {
    console.error('Erreur lors de la connexion:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la connexion.' });
  }
});

// Route pour mettre à jour le profil utilisateur
app.put('/api/auth/profile', authenticateToken, async (req, res) => {
  try {
    const { nom, niveau_scolaire } = req.body;
    const userId = req.user.id;

    // Mise à jour du profil
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { nom, niveau_scolaire },
      { new: true, select: '-mot_de_passe_hash' }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: 'Utilisateur non trouvé.' });
    }

    res.status(200).json({ message: 'Profil mis à jour avec succès.', user: updatedUser });
  } catch (error) {
    console.error('Erreur lors de la mise à jour du profil:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la mise à jour du profil.' });
  }
});

// Route pour générer un quiz
app.post('/api/quiz/generate', authenticateToken, async (req, res) => {
  try {
    const { niveau, matiere, sous_sujet, nombre_questions } = req.body;

    // Validation des données
    if (!niveau || !matiere || !sous_sujet || !nombre_questions) {
      return res.status(400).json({ message: 'Tous les paramètres sont requis.' });
    }

    console.log(`Generating quiz: ${niveau}, ${matiere}, ${sous_sujet}, ${nombre_questions} questions`);

    const prompt = `
      Tu es un professeur spécialisé en ${matiere} pour le niveau ${niveau}.  
      Le sous-sujet actuel est : ${sous_sujet}.
      Ton objectif est de générer ${nombre_questions} questions adaptées à ce niveau et à ce sous-sujet.  

      **Règles à suivre :**  
      1. Les questions doivent être en français et adaptées au niveau ${niveau}.
      2. Si tu fais référence à une image ou à un élément visuel, décris-le textuellement.  
      3. Chaque question doit être claire, concise et adaptée au niveau spécifié.  
      4. Formate chaque question comme suit :  
         - "Q1: [énoncé de la question] ?"  
         - "Q2: [énoncé de la question] ?"  
         - ...  
      5. **Ne montre pas ton processus de réflexion. Va directement aux questions.**  
      6. Arrête-toi exactement après avoir généré le nombre de questions demandé.
      7. Ne dépasse pas le nombre de questions demandé.
      8. Adapte la difficulté des questions au niveau scolaire ${niveau}.
    `;

    try {
      // First try connecting to Ollama
      const response = await axios.post('http://localhost:11434/api/generate', {
        model: 'deepseek-r1:8b',
        prompt: prompt,
        stream: false,
        options: {
          temperature: 0.7,
          top_p: 0.9,
          num_predict: 5000
        }
      });

      const questions = response.data.response
        .split('\n')
        .filter(q => q.trim().startsWith('Q') && q.includes('?'))
        .map(q => q.trim());

      // Make sure we have at least one question
      if (questions.length === 0) {
        throw new Error('No valid questions generated');
      }

      res.status(200).json({ questions });
    }
    catch (error) {
      console.error('Error generating quiz:', error);
      res.status(500).json({ message: 'Error generating quiz.' });
    }
  } catch (error) {
    console.error('Erreur lors de la génération du quiz:', error);
    res.status(500).json({ message: 'Erreur lors de la génération du quiz.' });
  }});


// Route pour générer un feedback
app.post('/api/quiz/feedback', authenticateToken, async (req, res) => {
  try {
    const { questions, reponses_utilisateur } = req.body;

    // Validation des données
    if (!questions || !reponses_utilisateur || questions.length !== reponses_utilisateur.length) {
      return res.status(400).json({ message: 'Questions et réponses doivent être fournies en nombre égal.' });
    }

    let feedback_prompt = `
      🎯 **Règles :**
      - Tu es un assistant d'école primaire bienveillant et pédagogue.
      - **Réponds uniquement en français**.
      - Pour chaque question :
        1. Si la réponse est correcte → Félicite avec un emoji positif (✅/👍/🌟).
        2. Si la réponse est partiellement correcte → Explique ce qui manque avec un emoji neutre (⚠️/🔎).
        3. Si la réponse est incorrecte → Explique en termes simples et identifie la lacune avec un emoji d'amélioration (🔄/📝).
        4. Donne toujours la bonne réponse quand l'élève se trompe.
      - Adapte ton langage à un niveau élémentaire.
      - Inclus un résumé à la fin avec les points forts et les points à améliorer.
      - Ne montre pas ton processus de réflexion interne.
    `;

    // Ajouter les questions et réponses de l'utilisateur au prompt
    feedback_prompt += "\nVoici les réponses d'un élève :\n";
    for (let i = 0; i < questions.length; i++) {
      feedback_prompt += `${questions[i]}\nRéponse de l'élève: ${reponses_utilisateur[i] || "(Pas de réponse)"}\n\n`;
    }

    const response = await axios.post('http://localhost:11434/api/generate', {
      model: 'deepseek-r1:8b',
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

app.get('/api/quiz/history', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    console.log(`Getting quiz history for user ID: ${userId}`);
    
    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Filtres optionnels
    const filters = {};
    
    try {
      filters.utilisateur_id = new mongoose.Types.ObjectId(userId);
    } catch (e) {
      console.error(`Invalid ObjectId: ${userId}`, e);
      return res.status(400).json({ message: 'Invalid user ID format' });
    }
    
    if (req.query.matiere) filters.matiere = req.query.matiere;
    if (req.query.niveau) filters.niveau = req.query.niveau;
    if (req.query.depuis) {
      const depuisDate = new Date(req.query.depuis);
      if (!isNaN(depuisDate.getTime())) {
        filters.date_creation = { $gte: depuisDate };
      }
    }

    console.log('Query filters:', JSON.stringify(filters));

    // Get quiz history with basic pagination
    const quizHistory = await Quiz.find(filters)
      .sort({ date_creation: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
    
    const totalQuiz = await Quiz.countDocuments(filters);

    // Basic stats
    const response = {
      quizHistory,
      pagination: {
        totalQuiz,
        totalPages: Math.ceil(totalQuiz / limit),
        currentPage: page,
        hasNext: skip + limit < totalQuiz,
        hasPrevious: page > 1
      },
      stats: {
        totalQuiz,
        scoresMoyens: {},
        matieresFavorites: [],
        progression: {}
      }
    };

    console.log(`Found ${quizHistory.length} quizzes for user ${userId}`);
    res.status(200).json(response);
  } catch (error) {
    console.error('Error getting quiz history:', error);
    res.status(500).json({ 
      message: 'Erreur serveur lors de la récupération de l\'historique.',
      error: error.message 
    });
  }
});

app.post('/api/quiz/history', authenticateToken, async (req, res) => {
  try {
    console.log('POST /api/quiz/history endpoint called');
    console.log('Request body:', JSON.stringify(req.body));
    
    const { niveau, matiere, sous_sujet, questions, reponses, feedback, manualScore } = req.body;
    const userId = req.user.id;

    console.log(`User ID from token: ${userId}`);

    // Validation des données
    if (!niveau || !matiere || !sous_sujet || !questions || !reponses) {
      console.log('Validation failed, missing required fields');
      return res.status(400).json({ message: 'Données incomplètes pour l\'enregistrement du quiz.' });
    }

    // Use the manual score if provided, otherwise calculate based on non-empty answers
    let score;
    if (manualScore !== undefined && manualScore !== null) {
      score = manualScore;
      console.log(`Using manually provided score: ${score}%`);
    } else {
      // Fallback to calculating based on answered questions
      const totalQuestions = questions.length;
      const answeredQuestions = reponses.filter(r => r && r.trim() !== '').length;
      score = Math.round((answeredQuestions / totalQuestions) * 100);
      console.log(`Calculated score from answered questions: ${score}%`);
    }

    // Create ObjectId from string
    let userObjectId;
    try {
      userObjectId = new mongoose.Types.ObjectId(userId);
      console.log('Valid ObjectId created:', userObjectId);
    } catch (err) {
      console.error('Failed to create ObjectId from userId:', userId, err);
      return res.status(400).json({ message: 'Invalid user ID format' });
    }

    // Extract lacunes from feedback (simplified)
    let lacunes = [];
    if (feedback) {
      const keywords = ['améliorer', 'difficultés', 'lacune', 'réviser', 'confusion'];
      const feedbackLines = feedback.split('\n');
      
      keywords.forEach(keyword => {
        feedbackLines.forEach(line => {
          if (line.toLowerCase().includes(keyword.toLowerCase())) {
            const cleanedLine = line.trim();
            if (!lacunes.includes(cleanedLine) && cleanedLine.length > 10) {
              lacunes.push(cleanedLine);
            }
          }
        });
      });
    }

    // Create quiz history record
    const newQuizHistory = new Quiz({
      utilisateur_id: userObjectId,
      niveau,
      matiere,
      sous_sujet,
      questions,
      reponses,
      feedback,
      score,
      lacunes: lacunes.slice(0, 5),
      date_creation: new Date()
    });

    console.log(`Saving quiz with score: ${score}%`);
    const savedQuiz = await newQuizHistory.save();
    console.log('Quiz saved successfully with ID:', savedQuiz._id);
    
    res.status(201).json({ 
      message: 'Quiz enregistré avec succès dans l\'historique.', 
      quizId: savedQuiz._id 
    });
  } catch (error) {
    console.error('Error saving quiz history:', error);
    res.status(500).json({ 
      message: 'Erreur serveur lors de l\'enregistrement du quiz.',
      error: error.message
    });
  }
});

// Route pour récupérer les détails d'un quiz spécifique
app.get('/api/quiz/history/:quizId', authenticateToken, async (req, res) => {
  try {
    const { quizId } = req.params;
    const userId = req.user.id;

    const quiz = await Quiz.findById(quizId);

    // Vérifier si le quiz existe et appartient à l'utilisateur
    if (!quiz) {
      return res.status(404).json({ message: 'Quiz non trouvé.' });
    }

    if (quiz.utilisateur_id.toString() !== userId) {
      return res.status(403).json({ message: 'Accès non autorisé à ce quiz.' });
    }

    res.status(200).json({ quiz });
  } catch (error) {
    console.error('Erreur lors de la récupération des détails du quiz:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération des détails du quiz.' });
  }
});

// Route pour les recommandations personnalisées
app.get('/api/quiz/recommendations', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Récupérer l'utilisateur pour obtenir son niveau
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé.' });
    }

    // Récupérer les lacunes identifiées dans les derniers quiz
    const recentQuizzes = await Quiz.find({ utilisateur_id: userId })
      .sort({ date_creation: -1 })
      .limit(5);

    // Extraire et compter les lacunes les plus fréquentes
    const lacunesCount = {};
    recentQuizzes.forEach(quiz => {
      quiz.lacunes.forEach(lacune => {
        lacunesCount[lacune] = (lacunesCount[lacune] || 0) + 1;
      });
    });

    // Identifier les matières avec les scores les plus bas
    const scoresBySubject = await Quiz.aggregate([
      { $match: { utilisateur_id: new mongoose.Types.ObjectId(userId) } },
      { $group: { _id: { matiere: '$matiere', sous_sujet: '$sous_sujet' }, scoreTotal: { $avg: '$score' } } },
      { $sort: { scoreTotal: 1 } },
      { $limit: 3 }
    ]);

    // Générer des recommandations
    const recommendations = {
      lacunesIdentifiees: Object.entries(lacunesCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([lacune]) => lacune),
      sujetsAtravailler: scoresBySubject.map(item => ({
        matiere: item._id.matiere,
        sous_sujet: item._id.sous_sujet,
        scoreMoyen: Math.round(item.scoreTotal)
      })),
      quizSuggeres: []
    };

    // Générer des suggestions de quiz
    if (scoresBySubject.length > 0) {
      const matiereFaible = scoresBySubject[0]._id.matiere;
      const sous_sujetFaible = scoresBySubject[0]._id.sous_sujet;

      // Générer un prompt pour obtenir des suggestions de quiz
      const prompt = `
        Tu es un conseiller pédagogique spécialisé pour le niveau ${user.niveau_scolaire}.
        L'élève a des difficultés en ${matiereFaible}, particulièrement sur le sous-sujet "${sous_sujetFaible}".
        Propose 3 idées de quiz éducatifs adaptés pour l'aider à s'améliorer dans ce domaine.
        
        Pour chaque suggestion, donne:
        1. Un titre court et attrayant
        2. Une brève description (1-2 phrases)
        3. Le niveau de difficulté (Facile, Moyen, Difficile)
        
        Format de réponse:
        [Titre 1]
        [Description 1]
        [Difficulté 1]
        
        [Titre 2]
        [Description 2]
        [Difficulté 2]
        
        [Titre 3]
        [Description 3]
        [Difficulté 3]
      `;

      const response = await axios.post('http://localhost:11434/api/generate', {
        model: 'deepseek-r1:8b',
        prompt: prompt,
        stream: false,
        options: {
          temperature: 0.7,
          top_p: 0.9,
          num_predict: 2000
        }
      });

      // Analyser la réponse pour extraire les suggestions
      const suggestions = response.data.response.split('\n\n');
      
      for (let i = 0; i < Math.min(suggestions.length, 3); i++) {
        const lines = suggestions[i].trim().split('\n');
        if (lines.length >= 3) {
          recommendations.quizSuggeres.push({
            titre: lines[0],
            description: lines[1],
            difficulte: lines[2],
            matiere: matiereFaible,
            sous_sujet: sous_sujetFaible
          });
        }
      }
    }

    res.status(200).json({ recommendations });
  } catch (error) {
    console.error('Erreur lors de la génération des recommandations:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la génération des recommandations.' });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://localhost:${PORT}`);
  
  // Print all registered routes
  console.log('\nRegistered routes:');
  registeredRoutes.forEach(route => {
    console.log(`${route.method}: ${route.path}`);
  });
  
  // Check for critical missing routes
  const criticalRoutes = [
    { method: 'GET', path: '/api/quiz/history' },
    { method: 'POST', path: '/api/quiz/history' },
    { method: 'GET', path: '/api/quiz/recommendations' }
  ];
  
  const missingRoutes = criticalRoutes.filter(cr => 
    !registeredRoutes.some(rr => 
      rr.method === cr.method && rr.path === cr.path
    )
  );
  
  if (missingRoutes.length > 0) {
    console.warn('\n⚠️ CRITICAL: Missing required routes:');
    missingRoutes.forEach(route => {
      console.warn(`${route.method}: ${route.path}`);
    });
  } else {
    console.log('\n✅ All critical routes are registered');
  }
});