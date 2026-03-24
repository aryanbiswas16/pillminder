const path = require('path');
const fs = require('fs');
const { Sequelize, DataTypes } = require('sequelize');

const logging = process.env.NODE_ENV === 'development' ? console.log : false;
const requestedDialect = process.env.DB_DIALECT;
const hasPostgresConfig = Boolean(
  process.env.DATABASE_URL ||
  (process.env.DB_HOST && process.env.DB_NAME && process.env.DB_USER)
);

const usePostgres = requestedDialect === 'postgres' || (!requestedDialect && hasPostgresConfig);

let sequelize;

if (usePostgres) {
  if (process.env.DATABASE_URL) {
    sequelize = new Sequelize(process.env.DATABASE_URL, {
      dialect: 'postgres',
      logging
    });
  } else {
    sequelize = new Sequelize(
      process.env.DB_NAME,
      process.env.DB_USER,
      process.env.DB_PASSWORD || '',
      {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT || 5432,
        dialect: 'postgres',
        logging
      }
    );
  }
} else {
  const sqliteStorage = process.env.SQLITE_STORAGE || path.join(__dirname, '../../data/pillminder.sqlite');
  fs.mkdirSync(path.dirname(sqliteStorage), { recursive: true });

  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: sqliteStorage,
    logging
  });
}

// User Model
const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: { isEmail: true }
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false
  },
  role: {
    type: DataTypes.ENUM('resident', 'caregiver', 'nurse', 'admin'),
    defaultValue: 'resident'
  },
  firstName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  lastName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  phone: {
    type: DataTypes.STRING
  },
  dateOfBirth: {
    type: DataTypes.DATEONLY
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  preferredLanguage: {
    type: DataTypes.STRING,
    defaultValue: 'en'
  },
  fontSizePreference: {
    type: DataTypes.ENUM('normal', 'large', 'extra-large'),
    defaultValue: 'large'
  },
  highContrastMode: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  room: {
    type: DataTypes.STRING
  }
}, {
  tableName: 'users',
  timestamps: true
});

// Care Relationship Model (links residents to caregivers/nurses)
const CareRelationship = sequelize.define('CareRelationship', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  residentId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'users', key: 'id' }
  },
  caregiverId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'users', key: 'id' }
  },
  relationshipType: {
    type: DataTypes.ENUM('family', 'nurse', 'doctor', 'other'),
    allowNull: false
  },
  canViewHistory: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  canModifySchedule: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  notificationsEnabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  notificationMethods: {
    type: DataTypes.JSON, // ['push', 'sms', 'email']
    defaultValue: ['push']
  }
}, {
  tableName: 'care_relationships',
  timestamps: true
});

// Medication Model
const Medication = sequelize.define('Medication', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  residentId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'users', key: 'id' }
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  dosage: {
    type: DataTypes.STRING, // e.g., "10mg", "1 tablet"
    allowNull: false
  },
  instructions: {
    type: DataTypes.TEXT // e.g., "Take with food"
  },
  color: {
    type: DataTypes.STRING, // hex color for visual identification
    defaultValue: '#3B82F6'
  },
  icon: {
    type: DataTypes.STRING, // emoji or icon name
    defaultValue: '💊'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'medications',
  timestamps: true
});

// Schedule Model (when medications should be taken)
const Schedule = sequelize.define('Schedule', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  medicationId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'medications', key: 'id' }
  },
  timeOfDay: {
    type: DataTypes.TIME,
    allowNull: false
  },
  daysOfWeek: {
    type: DataTypes.JSON, // [0,1,2,3,4,5,6] for daily, or specific days
    defaultValue: [0,1,2,3,4,5,6]
  },
  dosageAmount: {
    type: DataTypes.STRING,
    defaultValue: '1'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'schedules',
  timestamps: true
});

// Dose Model (actual medication events - taken, missed, skipped)
const Dose = sequelize.define('Dose', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  scheduleId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'schedules', key: 'id' }
  },
  medicationId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'medications', key: 'id' }
  },
  residentId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'users', key: 'id' }
  },
  scheduledTime: {
    type: DataTypes.DATE,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('pending', 'taken', 'missed', 'skipped', 'late'),
    defaultValue: 'pending'
  },
  takenAt: {
    type: DataTypes.DATE
  },
  takenBy: {
    type: DataTypes.UUID, // self or caregiver who logged it
    references: { model: 'users', key: 'id' }
  },
  notes: {
    type: DataTypes.TEXT
  }
}, {
  tableName: 'doses',
  timestamps: true
});

// Define relationships
User.hasMany(Medication, { foreignKey: 'residentId' });
Medication.belongsTo(User, { foreignKey: 'residentId', as: 'resident' });

Medication.hasMany(Schedule, { foreignKey: 'medicationId' });
Schedule.belongsTo(Medication, { foreignKey: 'medicationId' });

Schedule.hasMany(Dose, { foreignKey: 'scheduleId' });
Dose.belongsTo(Schedule, { foreignKey: 'scheduleId' });

Medication.hasMany(Dose, { foreignKey: 'medicationId' });
Dose.belongsTo(Medication, { foreignKey: 'medicationId' });

User.hasMany(Dose, { foreignKey: 'residentId' });
Dose.belongsTo(User, { foreignKey: 'residentId', as: 'resident' });

// Care relationships
User.belongsToMany(User, { 
  through: CareRelationship, 
  as: 'caregivers', 
  foreignKey: 'residentId',
  otherKey: 'caregiverId'
});

User.belongsToMany(User, { 
  through: CareRelationship, 
  as: 'patients', 
  foreignKey: 'caregiverId',
  otherKey: 'residentId'
});

// Direct associations on CareRelationship for eager-loading in dashboard queries
CareRelationship.belongsTo(User, { as: 'patient', foreignKey: 'residentId' });
CareRelationship.belongsTo(User, { as: 'caregiver', foreignKey: 'caregiverId' });

module.exports = {
  sequelize,
  User,
  CareRelationship,
  Medication,
  Schedule,
  Dose
};
