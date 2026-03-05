import { ImageSourcePropType } from 'react-native';

import type {
  AccommodationType,
  BudgetRange,
  UserGender,
} from '@/types/user-profile';

export type MatchPerson = {
  id: string;
  name: string;
  age: number;
  role: string;
  score: number;
  image: ImageSourcePropType;
  photos?: ImageSourcePropType[];
  whatsappNumber?: string;
  isVerified?: boolean;
  bio: string;
  preferences: string[];
  accommodationType?: AccommodationType;
  budgetRange?: BudgetRange;
  gender?: UserGender;
  hasAccommodation?: boolean;
  institutionName?: string;
  institutionKey?: string;
  campus?: string;
  town?: string;
  townKey?: string;
  estate?: string;
  locationLat?: number | null;
  locationLng?: number | null;
  locationRadiusKm?: number;
};

export const matchPeople: MatchPerson[] = [
  {
    id: '1',
    name: 'Teddy Omondi',
    age: 21,
    role: 'Bedsitter',
    score: 94,
    image: require('@/assets/images/image.png'),
    preferences: ['Women', 'Women', 'Women', 'Women'],
    bio: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Aliquam pulvinar malesuada scelerisque. Nullam et sollicitudin ipsum, ut mattis urna. Aenean aliquam tincidunt semper. Cras consectetur nibh id sapien ullamcorper maximus.',
  },
  {
    id: '2',
    name: 'Akinyi Moraa',
    age: 23,
    role: 'Studio',
    score: 91,
    image: require('@/assets/images/home-profile.png'),
    preferences: ['Women', 'Women', 'Women', 'Women'],
    bio: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Aliquam pulvinar malesuada scelerisque. Nullam et sollicitudin ipsum, ut mattis urna. Aenean aliquam tincidunt semper. Cras consectetur nibh id sapien ullamcorper maximus.',
  },
  {
    id: '3',
    name: 'Mark Otieno',
    age: 24,
    role: 'One Bedroom',
    score: 88,
    image: require('@/assets/images/image.png'),
    preferences: ['Women', 'Women', 'Women', 'Women'],
    bio: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Aliquam pulvinar malesuada scelerisque. Nullam et sollicitudin ipsum, ut mattis urna. Aenean aliquam tincidunt semper. Cras consectetur nibh id sapien ullamcorper maximus.',
  },
  {
    id: '4',
    name: 'Njeri Maina',
    age: 22,
    role: 'Bedsitter',
    score: 93,
    image: require('@/assets/images/home-profile.png'),
    preferences: ['Women', 'Women', 'Women', 'Women'],
    bio: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Aliquam pulvinar malesuada scelerisque. Nullam et sollicitudin ipsum, ut mattis urna. Aenean aliquam tincidunt semper. Cras consectetur nibh id sapien ullamcorper maximus.',
  },
  {
    id: '5',
    name: 'Kelvin Ouma',
    age: 25,
    role: 'Studio',
    score: 90,
    image: require('@/assets/images/image.png'),
    preferences: ['Women', 'Women', 'Women', 'Women'],
    bio: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Aliquam pulvinar malesuada scelerisque. Nullam et sollicitudin ipsum, ut mattis urna. Aenean aliquam tincidunt semper. Cras consectetur nibh id sapien ullamcorper maximus.',
  },
  {
    id: '6',
    name: 'Anne Wanjiru',
    age: 20,
    role: 'Bedsitter',
    score: 92,
    image: require('@/assets/images/home-profile.png'),
    preferences: ['Women', 'Women', 'Women', 'Women'],
    bio: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Aliquam pulvinar malesuada scelerisque. Nullam et sollicitudin ipsum, ut mattis urna. Aenean aliquam tincidunt semper. Cras consectetur nibh id sapien ullamcorper maximus.',
  },
  {
    id: '7',
    name: 'Brian Ochieng',
    age: 26,
    role: 'One Bedroom',
    score: 89,
    image: require('@/assets/images/image.png'),
    preferences: ['Women', 'Women', 'Women', 'Women'],
    bio: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Aliquam pulvinar malesuada scelerisque. Nullam et sollicitudin ipsum, ut mattis urna. Aenean aliquam tincidunt semper. Cras consectetur nibh id sapien ullamcorper maximus.',
  },
  {
    id: '8',
    name: 'Faith Anyango',
    age: 22,
    role: 'Studio',
    score: 95,
    image: require('@/assets/images/home-profile.png'),
    preferences: ['Women', 'Women', 'Women', 'Women'],
    bio: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Aliquam pulvinar malesuada scelerisque. Nullam et sollicitudin ipsum, ut mattis urna. Aenean aliquam tincidunt semper. Cras consectetur nibh id sapien ullamcorper maximus.',
  },
  {
    id: '9',
    name: 'Kevin Mutiso',
    age: 24,
    role: 'Bedsitter',
    score: 87,
    image: require('@/assets/images/image.png'),
    preferences: ['Women', 'Women', 'Women', 'Women'],
    bio: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Aliquam pulvinar malesuada scelerisque. Nullam et sollicitudin ipsum, ut mattis urna. Aenean aliquam tincidunt semper. Cras consectetur nibh id sapien ullamcorper maximus.',
  },
  {
    id: '10',
    name: 'Mercy Achieng',
    age: 23,
    role: 'One Bedroom',
    score: 94,
    image: require('@/assets/images/home-profile.png'),
    preferences: ['Women', 'Women', 'Women', 'Women'],
    bio: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Aliquam pulvinar malesuada scelerisque. Nullam et sollicitudin ipsum, ut mattis urna. Aenean aliquam tincidunt semper. Cras consectetur nibh id sapien ullamcorper maximus.',
  },
];
