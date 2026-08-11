window.CATALOG_SEED = Object.freeze({
  settings: {
    seller_name: 'Samuel Yamaha',
    whatsapp: '5569999999999',
  },
  categories: [
    { id: 'c1', name: 'Street', description: 'Motos urbanas e versáteis', icon: '🏍️', image_url: '', active: true, sort_order: 1 },
    { id: 'c2', name: 'Scooter', description: 'Praticidade para o dia a dia', icon: '🛵', image_url: '', active: true, sort_order: 2 },
    { id: 'c3', name: 'Naked', description: 'Design e desempenho', icon: '🏍️', image_url: '', active: true, sort_order: 3 },
    { id: 'c4', name: 'Trail', description: 'Aventura em qualquer terreno', icon: '🏍️', image_url: '', active: true, sort_order: 4 },
    { id: 'c5', name: 'Esportiva', description: 'Alta performance e esportividade', icon: '🏁', image_url: '', active: true, sort_order: 5 },
  ],
  motos: [
    {
      id: 'm1', name: 'Lander 250', category_id: 'c4', year_model: '2026', active: true, featured: true, sort_order: 1,
      description: 'A Lander 250 é feita para quem busca aventura e desempenho em qualquer terreno. Motor potente, design moderno e tecnologia que garante segurança e conforto em todas as jornadas.',
    },
    { id: 'm2', name: 'Fazer 250', category_id: 'c1', year_model: '2026', active: true, featured: true, sort_order: 2, description: 'Uma Yamaha equilibrada para uso urbano, com conforto, economia e desempenho para o dia a dia.' },
    { id: 'm3', name: 'NMAX 160', category_id: 'c2', year_model: '2026', active: true, featured: true, sort_order: 3, description: 'Scooter prática e confortável para mobilidade urbana.' },
    { id: 'm4', name: 'MT-03', category_id: 'c3', year_model: '2026', active: true, featured: false, sort_order: 4, description: 'Naked de visual marcante, proposta esportiva e agilidade para a cidade.' },
    { id: 'm5', name: 'R15', category_id: 'c5', year_model: '2026', active: true, featured: false, sort_order: 5, description: 'Esportiva leve, moderna e com visual inspirado nas motos de competição.' },
  ],
  photos: [],
  plans: [
    { id: 'p1', moto_id: 'm1', installments: 36, installment_value: 899.90, label: '', active: true, sort_order: 1 },
    { id: 'p2', moto_id: 'm1', installments: 45, installment_value: 749.90, label: '', active: true, sort_order: 2 },
    { id: 'p3', moto_id: 'm1', installments: 58, installment_value: 599.90, label: '', active: true, sort_order: 3 },
    { id: 'p4', moto_id: 'm1', installments: 70, installment_value: 519.90, label: '', active: true, sort_order: 4 },
    { id: 'p5', moto_id: 'm1', installments: 80, installment_value: 469.90, label: '', active: true, sort_order: 5 },
    { id: 'p6', moto_id: 'm2', installments: 80, installment_value: 439.90, label: '', active: true, sort_order: 1 },
    { id: 'p7', moto_id: 'm3', installments: 80, installment_value: 379.90, label: '', active: true, sort_order: 1 },
    { id: 'p8', moto_id: 'm4', installments: 80, installment_value: 579.90, label: '', active: true, sort_order: 1 },
    { id: 'p9', moto_id: 'm5', installments: 80, installment_value: 448.99, label: '', active: true, sort_order: 1 },
  ],
  leads: [],
});
