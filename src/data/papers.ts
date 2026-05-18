export type PaperStatus = 'published' | 'preprint' | 'coming_soon';

export interface Paper {
  key: string;
  status: PaperStatus;
  url?: string;
  thumbnail?: string;
}

export const PAPERS: Paper[] = [
  {
    key: 'paper_1',
    status: 'published',
    url: 'https://www.nature.com/articles/s41597-025-06502-7',
    thumbnail: '/static/research/paper-1.png',
  },
  {
    key: 'paper_2',
    status: 'preprint',
    url: 'https://arxiv.org/abs/2512.24211',
    thumbnail: '/static/research/paper-2.png',
  },
  { key: 'paper_3', status: 'coming_soon' },
  { key: 'paper_4', status: 'coming_soon' },
];
