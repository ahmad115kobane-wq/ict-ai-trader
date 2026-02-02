// src/routes/admin.ts
// Admin routes for user management

import express from 'express';
import { Pool } from 'pg';

const router = express.Router();

// Create PostgreSQL pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false
  } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

// Get all users with their subscription info
router.get('/users', async (req, res) => {
  try {
    const queryText = `
      SELECT 
        id,
        email,
        telegram_id,
        telegram_username,
        coins,
        subscription_package,
        subscription_expiry,
        subscription_status,
        created_at,
        last_login
      FROM users
      ORDER BY created_at DESC
    `;

    const result = await pool.query(queryText);

    res.json({
      success: true,
      users: result.rows,
      total: result.rows.length
    });
  } catch (error: any) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get single user details
router.get('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const queryText = `
      SELECT 
        id,
        email,
        telegram_id,
        telegram_username,
        coins,
        subscription_package,
        subscription_expiry,
        subscription_status,
        auto_analysis_enabled,
        created_at,
        last_login
      FROM users
      WHERE id = $1
    `;

    const result = await pool.query(queryText, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      user: result.rows[0]
    });
  } catch (error: any) {
    console.error('Error fetching user:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Update user (coins, subscription, etc.)
router.put('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      coins,
      subscription_package,
      subscription_expiry,
      subscription_status
    } = req.body;

    // Build update query dynamically
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (coins !== undefined) {
      updates.push(`coins = $${paramCount}`);
      values.push(coins);
      paramCount++;
    }

    if (subscription_package !== undefined) {
      updates.push(`subscription_package = $${paramCount}`);
      values.push(subscription_package);
      paramCount++;
    }

    if (subscription_expiry !== undefined) {
      updates.push(`subscription_expiry = $${paramCount}`);
      values.push(subscription_expiry);
      paramCount++;
    }

    if (subscription_status !== undefined) {
      updates.push(`subscription_status = $${paramCount}`);
      values.push(subscription_status);
      paramCount++;
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No fields to update'
      });
    }

    values.push(id);

    const queryText = `
      UPDATE users
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING 
        id,
        email,
        telegram_id,
        telegram_username,
        coins,
        subscription_package,
        subscription_expiry,
        subscription_status
    `;

    const result = await pool.query(queryText, values);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      user: result.rows[0],
      message: 'User updated successfully'
    });
  } catch (error: any) {
    console.error('Error updating user:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Add coins to user
router.post('/users/:id/add-coins', async (req, res) => {
  try {
    const { id } = req.params;
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid amount'
      });
    }

    const queryText = `
      UPDATE users
      SET coins = coins + $1
      WHERE id = $2
      RETURNING id, email, telegram_username, coins
    `;

    const result = await pool.query(queryText, [amount, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      user: result.rows[0],
      message: `Added ${amount} coins successfully`
    });
  } catch (error: any) {
    console.error('Error adding coins:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get statistics
router.get('/stats', async (req, res) => {
  try {
    const queries = {
      totalUsers: 'SELECT COUNT(*) as count FROM users',
      appUsers: 'SELECT COUNT(*) as count FROM users WHERE email IS NOT NULL AND telegram_id IS NULL',
      telegramUsers: 'SELECT COUNT(*) as count FROM users WHERE telegram_id IS NOT NULL',
      activeSubscriptions: `
        SELECT COUNT(*) as count FROM users 
        WHERE subscription_expiry IS NOT NULL 
        AND subscription_expiry > NOW()
      `,
      totalCoins: 'SELECT SUM(coins) as total FROM users',
      recentUsers: `
        SELECT COUNT(*) as count FROM users 
        WHERE created_at > NOW() - INTERVAL '7 days'
      `
    };

    const results = await Promise.all(
      Object.entries(queries).map(async ([key, queryText]) => {
        const result = await pool.query(queryText);
        return [key, result.rows[0]];
      })
    );

    const stats = Object.fromEntries(results);

    res.json({
      success: true,
      stats: {
        totalUsers: parseInt(stats.totalUsers.count),
        appUsers: parseInt(stats.appUsers.count),
        telegramUsers: parseInt(stats.telegramUsers.count),
        activeSubscriptions: parseInt(stats.activeSubscriptions.count),
        totalCoins: parseInt(stats.totalCoins.total || 0),
        recentUsers: parseInt(stats.recentUsers.count)
      }
    });
  } catch (error: any) {
    console.error('Error fetching stats:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
