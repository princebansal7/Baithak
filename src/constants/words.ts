export type Difficulty = 'easy' | 'medium' | 'hard';

export const DIFFICULTIES: { id: Difficulty; label: string }[] = [
  { id: 'easy', label: 'Easy' },
  { id: 'medium', label: 'Medium' },
  { id: 'hard', label: 'Hard' },
];

export const WORDS: Record<Difficulty, string[]> = {
  easy: [
    'Sun', 'Moon', 'Cat', 'Dog', 'Fish', 'Tree', 'House', 'Car', 'Ball', 'Book',
    'Chair', 'Apple', 'Banana', 'Flower', 'Cake', 'Hat', 'Shoe', 'Clock', 'Bus', 'Cow',
    'Bird', 'Boat', 'Key', 'Door', 'Star', 'Cup', 'Egg', 'Pizza', 'Bed', 'Umbrella',
    'Elephant', 'Spoon', 'Phone', 'Rain', 'Snake', 'Train', 'Candle', 'Kite', 'Rainbow', 'Mountain',
    'Ant', 'Arrow', 'Axe', 'Baby', 'Bag', 'Balloon', 'Bat', 'Bell',
    'Belt', 'Bench', 'Bicycle', 'Bone', 'Bowl', 'Bread', 'Bridge', 'Broom',
    'Brush', 'Bucket', 'Butterfly', 'Button', 'Camel', 'Candy', 'Carrot', 'Castle',
    'Chain', 'Cloud', 'Clown', 'Coin', 'Comb', 'Crab', 'Crown', 'Diamond',
    'Doll', 'Drum', 'Duck', 'Ear', 'Eye', 'Feather', 'Fan', 'Fire',
    'Flag', 'Fork', 'Frog', 'Ghost', 'Giraffe', 'Glasses', 'Guitar', 'Hammer',
    'Heart', 'Horse', 'Ice cream', 'Jar', 'Ladder', 'Lamp', 'Leaf', 'Lemon',
    'Lion', 'Lock', 'Mango', 'Monkey', 'Mouse', 'Nose', 'Onion', 'Owl',
    'Pen', 'Piano', 'Pillow', 'Plane', 'Rabbit', 'Ring', 'Robot', 'Rocket',
    'Sandwich', 'Scissors', 'Shark', 'Sheep', 'Ship', 'Sock', 'Spider', 'Swing',
    'Table', 'Tiger', 'Tooth', 'Towel', 'Turtle', 'Wallet', 'Watch', 'Whale',
    'Window', 'Worm', 'Zebra',
  ],
  medium: [
    'Cricket', 'Lighthouse', 'Passport', 'Volcano', 'Scarecrow', 'Treadmill', 'Selfie', 'Parachute', 'Pyramid', 'Backpack',
    'Telescope', 'Traffic jam', 'Rickshaw', 'Bollywood', 'Birthday party', 'Haircut', 'Fireworks', 'Sandcastle', 'Skateboard', 'Wedding',
    'Chess', 'Snowman', 'Cooking', 'Magician', 'Pirate', 'Vending machine', 'Waterfall', 'Yoga', 'Camping', 'Earthquake',
    'Library', 'Astronaut', 'Dentist', 'Monsoon', 'Tightrope', 'Fortune teller', 'Roller coaster', 'Piggy bank', 'Bicycle race', 'Diwali',
    'Alarm clock', 'Ambulance', 'Anchor', 'Arcade', 'Auction', 'Avalanche', 'Bakery', 'Barbecue',
    'Bodyguard', 'Bonfire', 'Boomerang', 'Bungee jumping', 'Cactus', 'Carnival', 'Chandelier', 'Chimney',
    'Circus', 'Cobweb', 'Compass', 'Construction', 'Cowboy', 'Crocodile', 'Detective', 'Dinosaur',
    'Dragon', 'Escalator', 'Fishing', 'Flood', 'Gardener', 'Genie', 'Gladiator', 'Graveyard',
    'Greenhouse', 'Haunted house', 'Helicopter', 'Hide and seek', 'Honeymoon', 'Hot air balloon', 'Igloo', 'Jigsaw puzzle',
    'Karaoke', 'Kidnap', 'Laundry', 'Lawyer', 'Magnet', 'Mermaid', 'Mosquito', 'Mummy',
    'Newspaper', 'Ninja', 'Octopus', 'Orchestra', 'Photographer', 'Pickpocket', 'Playground', 'Quicksand',
    'Referee', 'Robber', 'Sailor', 'Scuba diving', 'Shipwreck', 'Sleepwalking', 'Snorkel', 'Stampede',
    'Submarine', 'Sunburn', 'Superhero', 'Swimming pool', 'Tornado', 'Treasure map', 'Tsunami', 'Unicycle',
    'Vampire', 'Wheelbarrow', 'Windmill', 'Zombie', 'Auto rickshaw', 'Chai', 'Cricket bat', 'Holi',
    'Samosa', 'Taj Mahal',
  ],
  hard: [
    'Democracy', 'Procrastination', 'Gravity', 'Nostalgia', 'Inflation', 'Jealousy', 'Time zone', 'Karma', 'Déjà vu', 'Teamwork',
    'Privacy', 'Ambition', 'Silence', 'Evolution', 'Traffic rules', 'Work from home', 'Stock market', 'Climate change', 'Peer pressure', 'Cyber security',
    'Black hole', 'Brainstorm', 'Optical illusion', 'Social media', 'Bargaining', 'Multitasking', 'Artificial intelligence', 'Deadline', 'Superstition', 'Fake news',
    'Insomnia', 'Monopoly', 'Globalization', 'Placebo', 'Mid-life crisis', 'Cold war', 'Echo', 'Awkward silence', 'Photosynthesis', 'Recession',
  ],
};
