export const links = {
  resume: 'https://drive.google.com/file/d/11IPMfF7LSPDQNFa7S0mrfSV4WnD5PjyU/view?usp=sharing',
  medium: 'https://medium.com/@manya.manuseema',
  email: 'mailto:manya.manuseema@gmail.com',
  emailAddress: 'manya.manuseema@gmail.com',
  linkedin: 'https://www.linkedin.com/in/manyakaushikprofile/',
  works: 'https://manyaa.me/works',
  playground: 'https://manyaa.me/playground',
};

export const sections = [
  { id: 'top', label: 'Hello' },
  { id: 'work', label: 'Work' },
  { id: 'about', label: 'About' },
  { id: 'experiments', label: 'Play' },
  { id: 'contact', label: 'Contact' },
] as const;

export type CaseStudy = {
  id: string;
  index: string;
  name: string;
  type: string;
  description: string;
  tags: string[];
  image: string;
  url: string;
  tint: string;
  ink: string;
  year?: string;
  facets: Record<FacetKey, string>;
};

/** Filter dimensions for the case studies, in display order. */
export const facets = [
  { key: 'interface', label: 'Interface' },
  { key: 'distribution', label: 'Distribution' },
  { key: 'domain', label: 'Domain' },
] as const;

export type FacetKey = (typeof facets)[number]['key'];

export const caseStudies: CaseStudy[] = [
  {
    id: 'safety',
    index: '01',
    name: 'A little more trust.',
    type: 'Digital scam prevention',
    description:
      'An assistance layer within existing operating systems that helps people recognise digital scams — and find a clearer path to recovery.',
    tags: ['Systems thinking', 'Responsible technology'],
    image: '/assets/scam.webp',
    url: 'https://manyaa.me/works/scam-prevention',
    tint: '#e7e6f0',
    ink: '#3d3755',
    facets: { interface: 'Mobile', distribution: 'B2C', domain: 'Digital Safety' },
  },
  {
    id: 'sakhi',
    index: '02',
    name: 'Sakhi',
    type: 'Agentic AI · Voice interfaces',
    description:
      'Designed with and for Self-Help Groups, Sakhi makes bookkeeping a voice-driven collaboration between women and AI.',
    tags: ['Human–AI collaboration', 'Multimodal interaction'],
    image: '/assets/sakhi.webp',
    url: 'https://manyaa.me/works/sakhi',
    tint: '#efe0d3',
    ink: '#593a32',
    facets: { interface: 'Voice', distribution: 'Social Impact', domain: 'Financial Inclusion' },
  },
  {
    id: 'celebto',
    index: '03',
    name: 'Celebto',
    type: 'Personalised travel companion',
    description:
      'A personalised travel companion that turns trip planning into journeys shaped around each traveller’s own rhythm.',
    tags: ['Launched product', 'Web app design'],
    image: '/assets/celebto.webp',
    url: 'https://manyaa.me/works/celebto',
    tint: '#dce7eb',
    ink: '#293e49',
    facets: { interface: 'Web', distribution: 'B2C', domain: 'Travel Bookings' },
  },
];

export const studies = [
  {
    id: 'carey',
    name: 'CAREY',
    type: 'Service design',
    plant: '/assets/carey.webp',
    tint: '#e3dfed',
    description: 'A space to explore the relationships between people, systems, and care.',
  },
  {
    id: 'solis',
    name: 'Solis',
    type: 'Internet of things',
    plant: '/assets/sunflower.webp',
    tint: '#efe3af',
    description: 'One of the ways I explore connections between the digital and the physical.',
  },
  {
    id: 'sceneria',
    name: 'SCENERIA',
    type: 'Tangible user interface',
    plant: '/assets/sceneria.webp',
    tint: '#dce8d3',
    description: 'Exploring interaction beyond the screen.',
  },
];

export const testimonials = [
  {
    quote:
      'Manya has a great mix of strategy and design sense. She made it easy for us to turn complex ideas into something clear and scalable.',
    name: 'Anshumali Jain',
    role: 'Ex-Google, Founder, Celebto',
    tone: 'lilac',
  },
  {
    quote: 'Dependable and curious, she brings clarity, care, and great energy to every project.',
    name: 'Aastha Lathia',
    role: 'Co-worker, IIT Delhi',
    tone: 'butter',
  },
  {
    quote:
      'She instantly understood what the project needed and delivered exactly what we had in mind — reliable, clear, and a joy to work with.',
    name: 'Gaurav Giri',
    role: 'Client, Freelance',
    tone: 'rose',
  },
] as const;

export const whatIfs = [
  'What if technology felt as familiar as a conversation with Grandma?',
  'What if a tiny daily ritual could grow into something meaningful?',
  'What if an interface started with someone’s voice, rather than a screen?',
  'What if the most useful design decision was to leave something out?',
];

/** Skills, as listed on the résumé. */
export const skills = [
  'User experience design',
  'Interaction design',
  'Systems thinking',
  'Design systems',
  'Interface design',
  'Prototyping',
  'UX research',
  'Service design',
  'UX strategy',
  'Usability testing',
  'Data visualisation',
  'Sound design',
];
