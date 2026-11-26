// Modèles de semestre (matières, crédits ECTS et pondérations des évaluations).
// "ects: null" = crédits non trouvés dans les documents : une valeur provisoire (ectsProvisoire) est utilisée
// et l'étudiant est invité à la corriger. Les notes sont créées vides ("à venir").
// 3e valeur d'une évaluation (optionnelle) = clé de l'épreuve dans l'export Aurion (ex. MIDT, MCQ1, CONT2).
window.SEMESTER_TEMPLATES = [
  {
    id: 'pge-ba1-s1-2026',
    name: 'PGE Bachelor 1 — Semestre 1 (2026-2027)',
    note: "Pondérations relevées dans les supports de cours 2026-2027. Les crédits marqués « à confirmer » n'apparaissent dans aucun document : vérifie-les sur MyCourses ou Webaurion.",
    subjects: [
      {
        name: 'Business Exploration', code: '1720', ects: null, ectsProvisoire: 4,
        source: 'Business Exploration – S’organiser et apprendre en BusExp (2026)',
        evals: [
          ['QCM chapitre 1', 5, 'MCQ1'], ['QCM chapitre 3', 5, 'MCQ2'], ['QCM chapitre 4', 5, 'MCQ3'], ['QCM chapitre 5', 5, 'MCQ4'],
          ['QCM chapitre 9', 5, 'MCQ5'], ['QCM chapitres 7 & 8', 8, 'MCQ6'], ['QCM chapitres 10 & 11', 7, 'MCQ7'],
          ['Travaux de groupe', 40], ['Travail individuel (session poster)', 20]
        ]
      },
      {
        name: 'Investigating Business (projet interdisciplinaire)', code: '', ects: 3,
        source: 'Slide « Pondérations » du projet (rapport 60 % / oral 40 %, 3 ECTS)',
        evals: [
          ['Rapport – Business Exploration', 30], ['Rapport – Environnement juridique', 15],
          ['Rapport – Environnement économique', 15], ['Oral (jury de 3 professeurs)', 40]
        ]
      },
      {
        name: 'Environnement économique', code: '1721', ects: null, ectsProvisoire: 3,
        source: 'Environnement économique – Chapitre 0 + export Aurion',
        evals: [['Examen partiel (chap. 0 à 3)', 30, 'MIDT'], ['Examen final', 70]]
      },
      {
        name: 'Processus de décision du consommateur', code: '1725', ects: 3,
        source: 'Consignes du cours 2026-2027 (3 ECTS)',
        evals: [['Examen partiel', 40, 'MIDT'], ['Examen final', 60]]
      },
      {
        name: 'Environnement juridique', code: '1722', ects: null, ectsProvisoire: 3,
        source: 'Export Aurion (partiel 30 %) ; examen final supposé à 70 %',
        evals: [['Examen partiel', 30, 'MIDT'], ['Examen final (pondération supposée)', 70]]
      },
      {
        name: 'Méthodes quantitatives et mathématiques', code: '1726', ects: null, ectsProvisoire: 3,
        source: 'Export Aurion (partiel 25 %) ; examen final supposé à 75 %',
        evals: [['Examen partiel', 25, 'MIDT'], ['Examen final (pondération supposée)', 75]]
      },
      {
        name: 'English for Business', code: '1728', ects: null, ectsProvisoire: 2,
        source: 'English for Business 1728 – présentation 2026',
        evals: [
          ['Participation', 10, 'PARTN'], ['Grammar test 1', 8, 'EXERC1'], ['Grammar test 2', 8, 'EXERC2'], ['Grammar test 3', 8, 'EXERC3'],
          ['Final exam', 30], ['CONT1 – Individual presentation', 15, 'CONT1'], ['CONT2 – Successful Leader presentation', 21, 'CONT2']
        ]
      },
      {
        name: 'Academic & Professional Toolbox 1', code: '4041', ects: null, ectsProvisoire: 2,
        source: 'Slides séminaire de lancement APTB',
        evals: [
          ['Projet Voltaire', 10], ['Career – CV + profil LinkedIn', 15], ['CC Philo (présentations / débat)', 15],
          ['CC Présentation orale (Com Orga)', 15, 'GPROJ1'], ['CC Participation / engagement', 5],
          ['Examen final – Com Orga', 30], ['Examen final – Philo', 10]
        ]
      },
      {
        name: 'IT Skills (Compétences bureautiques)', code: '1796', ects: null, ectsProvisoire: 1.5,
        source: 'Kick-off IT Skills 1796 (5 × 0,4 pt + 1 pt + 17 pts sur 20)',
        evals: [
          ['Small test – bloc 1', 2], ['Small test – bloc 2', 2], ['Small test – bloc 3', 2],
          ['Small test – bloc 4', 2], ['Small test – bloc 5', 2], ['Devoir PowerPoint', 5], ['Examen final Excel', 85]
        ]
      },
      {
        name: 'Computing Logic', code: '', ects: null, ectsProvisoire: 1.5,
        source: 'Computing Logic – Lecture 1',
        evals: [['Devoirs hebdomadaires (projets Scratch)', 25], ['Examen final (40 QCM)', 75]]
      },
      {
        name: 'Séminaire de Responsabilité', code: '1801', ects: null, ectsProvisoire: 1,
        source: 'Syllabus étudiant 2026-2027',
        evals: [['Analyse SWOT + plan de développement', 85], ['Participation', 15]]
      },
      {
        name: 'Efficacité relationnelle et collective', code: '1723', ects: null, ectsProvisoire: 1,
        source: "Code Aurion 1723 ; les épreuves dépendent de l'atelier (théâtre : participation 60 % + examen 40 % ; autre atelier : vidéo 30 %…), elles sont ajoutées à l'import",
        evals: []
      }
    ]
  }
];
