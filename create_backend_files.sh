#!/bin/bash

cd /var/www/fundraiser-crm/backend

echo "📝 Creating server.js..."
cat > server.js << 'SERVER_EOF'
require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const apiRoutes = require('./routes/api');
app.use('/api', apiRoutes);

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Foundation Fundraiser CRM API is running',
    timestamp: new Date().toISOString()
  });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 API: http://localhost:${PORT}/api`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});
SERVER_EOF

echo "📝 Creating config/database.js..."
cat > config/database.js << 'DATABASE_EOF'
const { Sequelize } = require('sequelize');

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'fundraiser_crm',
  username: process.env.DB_USER || 'fundraiser_user',
  password: process.env.DB_PASSWORD,
  dialect: process.env.DB_DIALECT || 'postgres',
};

const sequelize = new Sequelize(
  dbConfig.database,
  dbConfig.username,
  dbConfig.password,
  {
    host: dbConfig.host,
    port: dbConfig.port,
    dialect: dbConfig.dialect,
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: { max: 5, min: 0, acquire: 30000, idle: 10000 }
  }
);

const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return false;
  }
};

const syncDatabase = async (options = {}) => {
  try {
    await sequelize.sync(options);
    console.log('✅ Database synchronized');
  } catch (error) {
    console.error('❌ Database sync error:', error);
    throw error;
  }
};

module.exports = { sequelize, testConnection, syncDatabase, Sequelize };
DATABASE_EOF

echo "📝 Creating models..."
cat > models/User.js << 'USER_MODEL_EOF'
const bcrypt = require('bcryptjs');

module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      validate: { isEmail: true }
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    firstName: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: 'first_name'
    },
    lastName: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: 'last_name'
    },
    role: {
      type: DataTypes.ENUM('admin', 'manager', 'staff', 'viewer'),
      defaultValue: 'staff'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'is_active'
    }
  }, {
    tableName: 'users',
    timestamps: true,
    hooks: {
      beforeCreate: async (user) => {
        if (user.password) {
          const salt = await bcrypt.genSalt(10);
          user.password = await bcrypt.hash(user.password, salt);
        }
      }
    }
  });

  User.prototype.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
  };

  User.prototype.toJSON = function() {
    const values = { ...this.get() };
    delete values.password;
    return values;
  };

  return User;
};
USER_MODEL_EOF

cat > models/Donor.js << 'DONOR_MODEL_EOF'
module.exports = (sequelize, DataTypes) => {
  const Donor = sequelize.define('Donor', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    firstName: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: 'first_name'
    },
    lastName: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: 'last_name'
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      validate: { isEmail: true }
    },
    phone: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    totalDonated: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0.00,
      field: 'total_donated'
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive'),
      defaultValue: 'active'
    }
  }, {
    tableName: 'donors',
    timestamps: true
  });

  Donor.associate = (models) => {
    Donor.hasMany(models.Donation, { foreignKey: 'donor_id', as: 'donations' });
  };

  return Donor;
};
DONOR_MODEL_EOF

cat > models/Donation.js << 'DONATION_MODEL_EOF'
module.exports = (sequelize, DataTypes) => {
  const Donation = sequelize.define('Donation', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    donorId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'donor_id'
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    paymentMethod: {
      type: DataTypes.ENUM('credit_card', 'bank_transfer', 'cash'),
      allowNull: false,
      field: 'payment_method'
    },
    status: {
      type: DataTypes.ENUM('pending', 'completed', 'failed'),
      defaultValue: 'pending'
    },
    donationDate: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'donation_date'
    }
  }, {
    tableName: 'donations',
    timestamps: true
  });

  Donation.associate = (models) => {
    Donation.belongsTo(models.Donor, { foreignKey: 'donor_id', as: 'donor' });
  };

  return Donation;
};
DONATION_MODEL_EOF

cat > models/index.js << 'MODELS_INDEX_EOF'
const { sequelize, Sequelize } = require('../config/database');

const models = {
  User: require('./User')(sequelize, Sequelize.DataTypes),
  Donor: require('./Donor')(sequelize, Sequelize.DataTypes),
  Donation: require('./Donation')(sequelize, Sequelize.DataTypes),
};

Object.keys(models).forEach(modelName => {
  if (models[modelName].associate) {
    models[modelName].associate(models);
  }
});

module.exports = { ...models, sequelize, Sequelize };
MODELS_INDEX_EOF

echo "📝 Creating controllers..."
cat > controllers/authController.js << 'AUTH_CONTROLLER_EOF'
const jwt = require('jsonwebtoken');
const { User } = require('../models');

const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

exports.register = async (req, res) => {
  try {
    const { email, password, firstName, lastName, role } = req.body;

    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ error: 'User already exists' });
    }

    const user = await User.create({ email, password, firstName, lastName, role: role || 'staff' });
    const token = generateToken(user.id);

    res.status(201).json({ message: 'User registered', user: user.toJSON(), token });
  } catch (error) {
    res.status(500).json({ error: 'Registration failed', message: error.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ where: { email } });
    if (!user || !await user.comparePassword(password)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = generateToken(user.id);
    res.json({ message: 'Login successful', user: user.toJSON(), token });
  } catch (error) {
    res.status(500).json({ error: 'Login failed', message: error.message });
  }
};

exports.getCurrentUser = async (req, res) => {
  res.json({ user: req.user });
};
AUTH_CONTROLLER_EOF

cat > controllers/donorController.js << 'DONOR_CONTROLLER_EOF'
const { Donor } = require('../models');

exports.getAllDonors = async (req, res) => {
  try {
    const donors = await Donor.findAll();
    res.json({ donors });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch donors' });
  }
};

exports.createDonor = async (req, res) => {
  try {
    const donor = await Donor.create(req.body);
    res.status(201).json({ message: 'Donor created', donor });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create donor' });
  }
};
DONOR_CONTROLLER_EOF

echo "📝 Creating middleware..."
cat > middleware/auth.js << 'AUTH_MIDDLEWARE_EOF'
const jwt = require('jsonwebtoken');
const { User } = require('../models');

exports.authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.userId, { attributes: { exclude: ['password'] } });

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};
AUTH_MIDDLEWARE_EOF

echo "📝 Creating routes..."
cat > routes/api.js << 'ROUTES_EOF'
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const donorController = require('../controllers/donorController');
const { authenticate } = require('../middleware/auth');

router.post('/auth/register', authController.register);
router.post('/auth/login', authController.login);
router.get('/auth/me', authenticate, authController.getCurrentUser);

router.get('/donors', authenticate, donorController.getAllDonors);
router.post('/donors', authenticate, donorController.createDonor);

module.exports = router;
ROUTES_EOF

echo "📝 Creating migration script..."
cat > scripts/migrate.js << 'MIGRATE_EOF'
require('dotenv').config();
const { sequelize, testConnection, syncDatabase } = require('../config/database');

async function migrate() {
  console.log('🔄 Starting migration...');
  
  const connected = await testConnection();
  if (!connected) {
    console.error('❌ Database connection failed');
    process.exit(1);
  }

  await syncDatabase({ alter: true });
  console.log('✅ Migration complete!');
  process.exit(0);
}

migrate();
MIGRATE_EOF

echo "📝 Creating seed script..."
cat > scripts/seed.js << 'SEED_EOF'
require('dotenv').config();
const { User, Donor, Donation, sequelize } = require('../models');

async function seed() {
  console.log('🌱 Seeding database...');

  await sequelize.authenticate();

  const admin = await User.create({
    email: 'admin@fundraiser.org',
    password: 'Admin123!',
    firstName: 'Admin',
    lastName: 'User',
    role: 'admin'
  });

  const donor1 = await Donor.create({
    firstName: 'John',
    lastName: 'Smith',
    email: 'john@example.com',
    phone: '555-0100',
    status: 'active'
  });

  await Donation.create({
    donorId: donor1.id,
    amount: 500.00,
    paymentMethod: 'credit_card',
    status: 'completed'
  });

  console.log('✅ Seed complete!');
  console.log('Login: admin@fundraiser.org / Admin123!');
  process.exit(0);
}

seed();
SEED_EOF

echo "✅ All backend files created!"
echo ""
echo "Backend structure:"
tree -L 2 backend/ 2>/dev/null || find backend/ -type f | head -20

