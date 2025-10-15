require('dotenv').config();
const mongoose = require('mongoose');
const Jury = require('./models/Jury');
const Team = require('./models/Team');
const Config = require('./models/Config');
const Track = require('./models/Track');
const Marks = require('./models/Marks');

const seedData = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Clear existing data
    await Marks.deleteMany({});
    await Jury.deleteMany({});
    await Team.deleteMany({});
    await Config.deleteMany({});
    await Track.deleteMany({});
    console.log('Cleared existing data');

    // Create tracks
    const tracks = await Track.insertMany([
      {
        name: 'Track 1 - Innovation',
        slug: 'track-1',
        eventName: 'Innovation Sprint',
        description: 'Ideas and prototypes focusing on innovation.',
        isActive: true
      },
      {
        name: 'Track 2 - Sustainability',
        slug: 'track-2',
        eventName: 'Sustainability Challenge',
        description: 'Solutions for environmental and social impact.',
        isActive: true
      }
    ]);

    const [trackOne, trackTwo] = tracks;

    // Create sample juries
    const juries = await Jury.insertMany([
      {
        name: 'Jury Panel 1',
        assignments: [{ track: trackOne._id }],
        defaultTrack: trackOne._id
      },
      {
        name: 'Jury Panel 2',
        assignments: [{ track: trackOne._id }],
        defaultTrack: trackOne._id
      },
      {
        name: 'Jury Panel 3',
        assignments: [{ track: trackTwo._id }],
        defaultTrack: trackTwo._id
      },
      {
        name: 'Technical Jury',
        assignments: [{ track: trackTwo._id }],
        defaultTrack: trackTwo._id
      },
      {
        name: 'Industry Experts',
        assignments: [
          { track: trackOne._id },
          { track: trackTwo._id }
        ],
        defaultTrack: trackOne._id
      }
    ]);
    console.log('Created sample juries');

    // Create sample teams
    const teams = await Team.insertMany([
      { name: 'Tech Innovators', category: 'Technology', track: trackOne._id },
      { name: 'Green Solutions', category: 'Environment', track: trackOne._id },
      { name: 'Health Heroes', category: 'Healthcare', track: trackOne._id },
      { name: 'EduTech Pioneers', category: 'Education', track: trackOne._id },
      { name: 'FinTech Warriors', category: 'Finance', track: trackOne._id },
      { name: 'Sustainability Stars', category: 'Sustainability', track: trackTwo._id },
      { name: 'Eco Innovators', category: 'Eco-Tech', track: trackTwo._id },
      { name: 'Water Guardians', category: 'Water Tech', track: trackTwo._id },
      { name: 'Circular Economy', category: 'Circular Economy', track: trackTwo._id },
      { name: 'Smart Cities', category: 'Smart Infrastructure', track: trackTwo._id }
    ]);
    console.log('Created sample teams');

    // Create default configuration
    const config = new Config({
      criteria: ['INNOVATION', 'CREATIVITY', 'FEASIBILITY', 'PRESENTATION'],
      maxMarksPerCriterion: 20,
      competitionName: 'Inter-College Tech Competition 2024',
      collegeName: 'ABC College of Technology',
      clubName: 'Tech Innovation Club'
    });

    await config.save();
    console.log('Created default configuration');

    console.log('✅ Sample data seeded successfully!');
    console.log(`📊 Created ${juries.length} juries, ${teams.length} teams, and ${tracks.length} tracks`);
    
  } catch (error) {
    console.error('Error seeding data:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
};

// Run the seed function
if (require.main === module) {
  seedData();
}

module.exports = seedData;