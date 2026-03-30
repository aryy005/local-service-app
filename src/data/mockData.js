export const categories = [
  { id: 'cat-1', name: 'Tailor', icon: 'Scissors', description: 'Custom stitching, alterations & repairs.' },
  { id: 'cat-2', name: 'Carpenter', icon: 'Hammer', description: 'Furniture making, woodworks & repairs.' },
  { id: 'cat-3', name: 'Painter', icon: 'Paintbrush', description: 'Wall painting, polishing & textures.' },
  { id: 'cat-4', name: 'Cobbler', icon: 'Footprint', description: 'Shoe mending, polishing & modifications.' },
  { id: 'cat-5', name: 'Electrician', icon: 'Zap', description: 'Wiring, fixtures, and electrical repairs.' },
  { id: 'cat-6', name: 'Plumber', icon: 'Wrench', description: 'Pipe fitting, leak repairs & installations.' }
];

export const providers = [
  {
    id: 'prov-1',
    name: 'Rajesh Kumar',
    categoryId: 'cat-1',
    rating: 4.8,
    reviewsCount: 124,
    location: 'Downtown Area',
    hourlyRate: 15,
    description: 'Expert tailor with over 15 years of experience in custom suiting and quick alterations. I guarantee a perfect fit every time.',
    skills: ['Suits', 'Alterations', 'Embroidery'],
    reviews: [
      { id: 'r1', user: 'Amit S.', rating: 5, comment: 'Fantastic work! Fixed my jacket perfectly.' },
      { id: 'r2', user: 'Priya M.', rating: 4, comment: 'Very timely and professional.' }
    ],
    avatarUrl: 'https://images.unsplash.com/photo-1544723795-3cj5a4a5t6f1?auto=format&fit=crop&q=80&w=150&h=150'
  },
  {
    id: 'prov-2',
    name: 'Vikram Singh',
    categoryId: 'cat-2',
    rating: 4.9,
    reviewsCount: 89,
    location: 'North Side',
    hourlyRate: 25,
    description: 'Master carpenter specializing in bespoke furniture and modern wooden interiors. Quality timber only.',
    skills: ['Furniture', 'Cabinetry', 'Repairs'],
    reviews: [
      { id: 'r3', user: 'Neha K.', rating: 5, comment: 'Built a beautiful custom bookshelf for my study.' }
    ],
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150&h=150'
  },
  {
    id: 'prov-3',
    name: 'Anil Painter',
    categoryId: 'cat-3',
    rating: 4.6,
    reviewsCount: 56,
    location: 'East Side',
    hourlyRate: 18,
    description: 'Professional painter with expertise in home interiors and waterproofing. I leave the place spotless.',
    skills: ['Interior', 'Exterior', 'Textures'],
    reviews: [
      { id: 'r4', user: 'Rahul V.', rating: 5, comment: 'Very neat job. Painted my whole apartment in 2 days.' },
      { id: 'r5', user: 'Sneha P.', rating: 4, comment: 'Good work, but arrived a bit late.' }
    ],
    avatarUrl: 'https://images.unsplash.com/photo-1552058544-e2eb4ba49d8e?auto=format&fit=crop&q=80&w=150&h=150'
  },
  {
    id: 'prov-4',
    name: 'Sham the Cobbler',
    categoryId: 'cat-4',
    rating: 4.7,
    reviewsCount: 200,
    location: 'Main Market Stage',
    hourlyRate: 10,
    description: 'Trusted by the community for 20 years. Give your old shoes a new life! Specialized in leather.',
    skills: ['Leather Repair', 'Polishing', 'Stitching'],
    reviews: [
      { id: 'r6', user: 'John D.', rating: 5, comment: 'Saved my favorite boots!' }
    ],
    avatarUrl: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?auto=format&fit=crop&q=80&w=150&h=150'
  },
  {
    id: 'prov-5',
    name: 'Arun Electric',
    categoryId: 'cat-5',
    rating: 4.9,
    reviewsCount: 312,
    location: 'West Zone',
    hourlyRate: 22,
    description: 'Licensed electrician for all home and commercial needs. Safety first!',
    skills: ['Wiring', 'Appliance Repair', 'Lighting'],
    reviews: [
      { id: 'r7', user: 'Kiran B.', rating: 5, comment: 'Fixed the short circuit issue quickly.' }
    ],
    avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150&h=150'
  },
  {
    id: 'prov-6',
    name: 'Deepak Plumbing Services',
    categoryId: 'cat-6',
    rating: 4.5,
    reviewsCount: 145,
    location: 'South Side',
    hourlyRate: 20,
    description: 'Fast and reliable plumbing services. 24/7 emergency calls accepted.',
    skills: ['Pipe Fitting', 'Leak fixes', 'Installation'],
    reviews: [
      { id: 'r8', user: 'Tanya R.', rating: 4, comment: 'Fixed the sink but charged a bit high for parts.' },
      { id: 'r9', user: 'Suresh L.', rating: 5, comment: 'Very professional.' }
    ],
    avatarUrl: 'https://images.unsplash.com/photo-1527980965255-d3b416303d12?auto=format&fit=crop&q=80&w=150&h=150'
  }
];
