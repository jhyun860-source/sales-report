import mysql from 'mysql2/promise';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('ERROR: DATABASE_URL environment variable is not set');
  process.exit(1);
}

async function addMissingColumns() {
  let connection;
  try {
    // Parse connection string
    const url = new URL(connectionString);
    const config = {
      host: url.hostname,
      user: url.username,
      password: url.password,
      database: url.pathname.slice(1),
      ssl: {
        rejectUnauthorized: false,
      },
      waitForConnections: true,
      connectionLimit: 1,
      queueLimit: 0,
    };

    console.log(`[INFO] Connecting to TiDB at ${config.host}...`);
    connection = await mysql.createConnection(config);
    console.log('[✓] Connected to TiDB');

    // Check current columns
    console.log('\n[INFO] Checking current dailySalesRecords schema...');
    const [columns] = await connection.execute('DESCRIBE dailySalesRecords');
    const existingColumns = columns.map(col => col.Field);
    console.log(`[✓] Current columns: ${existingColumns.length} columns found`);

    // Define columns to add
    const columnsToAdd = [
      'totalRevenue',
      'commissionExpense',
      'rentExpense',
      'managementFeeExpense',
      'staffWageExpense',
      'managerWageExpense',
      'partTimeWageExpense',
      'liquorCostExpense',
      'staffDrinkExpense',
      'salesIncentiveExpense',
      'otherExpense',
      'totalExpenses',
      'netProfit',
    ];

    // Filter columns that don't exist
    const missingColumns = columnsToAdd.filter(col => !existingColumns.includes(col));
    
    if (missingColumns.length === 0) {
      console.log('[✓] All required columns already exist!');
      return;
    }

    console.log(`\n[INFO] Adding ${missingColumns.length} missing columns...`);

    // Build ALTER TABLE statement
    const alterStatements = missingColumns.map(col => 
      `ADD COLUMN \`${col}\` decimal(15,0) DEFAULT '0' NOT NULL`
    ).join(', ');

    const alterSQL = `ALTER TABLE \`dailySalesRecords\` ${alterStatements}`;
    
    console.log('[INFO] Executing ALTER TABLE...');
    await connection.execute(alterSQL);
    console.log('[✓] ALTER TABLE completed successfully');

    // Verify columns were added
    console.log('\n[INFO] Verifying columns...');
    const [updatedColumns] = await connection.execute('DESCRIBE dailySalesRecords');
    console.log(`[✓] Total columns after update: ${updatedColumns.length}`);
    
    // Show the new columns
    const newColumns = updatedColumns.filter(col => missingColumns.includes(col.Field));
    console.log('\n[✓] Successfully added columns:');
    newColumns.forEach(col => {
      console.log(`  - ${col.Field}: ${col.Type}`);
    });

    console.log('\n[✓] Database schema update completed!');

  } catch (error) {
    console.error('[ERROR]', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('[INFO] Connection closed');
    }
  }
}

addMissingColumns();
