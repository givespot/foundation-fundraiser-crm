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
