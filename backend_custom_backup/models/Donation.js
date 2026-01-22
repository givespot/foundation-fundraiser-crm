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
