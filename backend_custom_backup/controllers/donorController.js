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
