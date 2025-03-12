import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; 
import { Component, OnInit } from '@angular/core';
import { QuizService } from '../../services/quiz.service';
import { AuthService } from '../../services/auth.service';
import { RouterLink } from '@angular/router'; 

@Component({
  selector: 'app-quiz',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink], // Retire HttpClientModule
  templateUrl: './quiz.component.html',
  styleUrls: ['./quiz.component.css']
})
export class QuizComponent implements OnInit {
  niveau: string = 'CP';
  matiere: string = 'Maths';
  sous_sujet: string = '';
  nombre_questions: number = 5;
  questions: string[] = [];
  answers: string[] = [];
  feedback: string = '';

  mathTopics: { [key: string]: string[] } = {
    CP: ["Comprendre et utiliser les nombres entiers pour dénombrer, ordonner, repérer et comparer", "Résoudre des problèmes en utilisant des nombres entiers"],
    CE1: ["Poursuivre l'apprentissage de la numération en travaillant sur les nombres jusqu'à 1 000", "Approfondir les techniques opératoires de l'addition et de la soustraction"],
    CE2: ["Étendre la connaissance des nombres jusqu'à 10 000", "Maîtriser les techniques opératoires de l'addition, de la soustraction et de la multiplication"],
    CM1: ["Étude des nombres entiers jusqu'au million", "Maîtrise des quatre opérations avec des nombres entiers"],
    CM2: ["Nombres entiers et décimaux", "Fractions"]
  };

  constructor(private quizService: QuizService, public authService: AuthService) {}

  ngOnInit(): void {
    if (!this.authService.isLoggedIn()) {
      // Rediriger vers la page de connexion si l'utilisateur n'est pas connecté
    }
  }

  generateQuiz(): void {
    this.quizService.generateQuiz(this.niveau, this.matiere, this.sous_sujet, this.nombre_questions).subscribe(
      (response) => {
        this.questions = response.questions;
        this.answers = new Array(this.questions.length).fill('');
      },
      (error) => {
        console.error('Erreur lors de la génération du quiz', error);
      }
    );
  }

  submitAnswers(): void {
    if (!this.authService.isLoggedIn()) {
      console.error('Utilisateur non connecté.');
      return;
    }

    const utilisateur_id = this.authService.getCurrentUser()._id;

    // Ajouter le quiz à l'historique
    this.quizService.addQuizToHistory({
      utilisateur_id,
      niveau: this.niveau,
      matiere: this.matiere,
      sous_sujet: this.sous_sujet,
      score: this.answers.filter(answer => answer.trim() !== '').length,
      lacunes: [] // À remplir avec les lacunes détectées
    }).subscribe(
      () => {
        // Générer le feedback après avoir ajouté le quiz à l'historique
        this.quizService.generateFeedback(this.questions, this.answers).subscribe(
          (response) => {
            this.feedback = response.feedback; // Stocker le feedback
          },
          (error) => {
            console.error('Erreur lors de la génération du feedback :', error);
          }
        );
      },
      (error) => {
        console.error('Erreur lors de l\'ajout du quiz à l\'historique :', error);
      }
    );
  }
}