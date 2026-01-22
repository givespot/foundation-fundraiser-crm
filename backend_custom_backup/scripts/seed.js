require('dotenv').config();
const { User, Donor, Donation, sequelize } = require('../models');

async function seed() {
  console.log('🌱 Seeding database...');

  try {
    // Ensure tables exist
    await sequelize.sync({ alter: true });
    console.log('✅ Tables ready');

    // Create admin user
    const admin = await User.create({
      email: 'admin@fundraiser.org',
      password: 'Admin123!',
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin'
    });
    console.log('✅ Admin user created');

    // Create sample donor
    const donor1 = await Donor.create({
      firstName: 'John',
      lastName: 'Smith',
      email: 'john@example.com',
      phone: '555-0100',
      status: 'active'
    });
    console.log('✅ Sample donor created');

    // Create sample donation
    await Donation.create({
      donorId: donor1.id,
      amount: 500.00,
      paymentMethod: 'credit_card',
      status: 'completed'
    });
    console.log('✅ Sample donation created');

    console.log('');
    console.log('✅ Seed complete!');
    console.log('📧 Login: admin@fundraiser.org');
    console.log('🔑 Password: Admin123!');
    console.log('');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Seed failed:', error.message);
    process.exit(1);
  }
}

seed();
