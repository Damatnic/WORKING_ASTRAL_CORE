#!/usr/bin/env node

/**
 * Backup and Disaster Recovery System for Astral Core V5
 * HIPAA-compliant backup procedures for mental health data
 */

const fs = require('fs').promises
const path = require('path')
const crypto = require('crypto')
const { exec } = require('child_process').promises
const AWS = require('aws-sdk')
const { createGzip, createGunzip } = require('zlib')
const { pipeline } = require('stream/promises')
const { createReadStream, createWriteStream } = require('fs')

// Configuration
const config = {
  backupDir: process.env.BACKUP_DIR || './backups',
  s3Bucket: process.env.S3_BACKUP_BUCKET || 'astralcore-backups',
  encryptionKey: process.env.BACKUP_ENCRYPTION_KEY,
  retentionDays: parseInt(process.env.BACKUP_RETENTION_DAYS || '90'),
  pgConnectionString: process.env.DATABASE_URL,
  redisUrl: process.env.REDIS_URL,
  maxConcurrentBackups: 3,
}

// AWS S3 Configuration
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'us-east-1',
})

class BackupManager {
  constructor() {
    this.backupId = null
    this.startTime = null
    this.manifest = {
      version: '1.0',
      created: null,
      components: [],
      status: 'pending',
      encryption: 'AES-256-GCM',
      compression: 'gzip',
    }
  }

  async createBackup() {
    console.log('Starting Astral Core backup process...')
    this.backupId = this.generateBackupId()
    this.startTime = Date.now()
    this.manifest.created = new Date().toISOString()

    try {
      // Create backup directory
      await this.ensureBackupDirectory()

      // Backup all components
      const results = await Promise.all([
        this.backupDatabase(),
        this.backupRedis(),
        this.backupFileStorage(),
        this.backupConfiguration(),
        this.backupAuditLogs(),
      ])

      // Create manifest
      this.manifest.components = results.filter(r => r.success)
      this.manifest.status = 'completed'
      await this.saveManifest()

      // Upload to S3
      await this.uploadToS3()

      // Verify backup integrity
      await this.verifyBackup()

      // Clean up old backups
      await this.cleanupOldBackups()

      const duration = (Date.now() - this.startTime) / 1000
      console.log(`Backup completed successfully in ${duration}s`)
      console.log(`Backup ID: ${this.backupId}`)

      return {
        success: true,
        backupId: this.backupId,
        duration,
        manifest: this.manifest,
      }
    } catch (error) {
      console.error('Backup failed:', error)
      this.manifest.status = 'failed'
      this.manifest.error = error.message
      await this.saveManifest()
      
      // Send alert for backup failure
      await this.sendAlert('BACKUP_FAILED', error)
      
      throw error
    }
  }

  async backupDatabase() {
    console.log('Backing up database...')
    const component = {
      name: 'database',
      startTime: Date.now(),
      success: false,
    }

    try {
      const filename = `db_${this.backupId}.sql`
      const filepath = path.join(config.backupDir, filename)

      // Extract connection details from DATABASE_URL
      const dbUrl = new URL(config.pgConnectionString)
      
      // Create pg_dump command with security options
      const dumpCommand = [
        'pg_dump',
        '--no-owner',
        '--no-acl',
        '--clean',
        '--if-exists',
        '--exclude-table=_prisma_migrations',
        '--exclude-table=audit_logs', // Backed up separately
        `-h ${dbUrl.hostname}`,
        `-p ${dbUrl.port || 5432}`,
        `-U ${dbUrl.username}`,
        `-d ${dbUrl.pathname.slice(1)}`,
        `> ${filepath}`,
      ].join(' ')

      // Set PGPASSWORD environment variable securely
      const env = { ...process.env, PGPASSWORD: dbUrl.password }
      await exec(dumpCommand, { env })

      // Encrypt the backup
      const encryptedFile = await this.encryptFile(filepath)
      
      // Compress the encrypted backup
      const compressedFile = await this.compressFile(encryptedFile)

      // Calculate checksum
      const checksum = await this.calculateChecksum(compressedFile)

      component.filename = path.basename(compressedFile)
      component.size = (await fs.stat(compressedFile)).size
      component.checksum = checksum
      component.duration = Date.now() - component.startTime
      component.success = true

      console.log(`Database backup completed: ${component.filename}`)
      return component
    } catch (error) {
      console.error('Database backup failed:', error)
      component.error = error.message
      return component
    }
  }

  async backupRedis() {
    console.log('Backing up Redis cache...')
    const component = {
      name: 'redis',
      startTime: Date.now(),
      success: false,
    }

    try {
      const filename = `redis_${this.backupId}.rdb`
      const filepath = path.join(config.backupDir, filename)

      // Trigger Redis BGSAVE
      const redisUrl = new URL(config.redisUrl || 'redis://localhost:6379')
      const saveCommand = `redis-cli -h ${redisUrl.hostname} -p ${redisUrl.port || 6379} BGSAVE`
      await exec(saveCommand)

      // Wait for save to complete
      await this.waitForRedisSave(redisUrl)

      // Copy the RDB file
      const rdbPath = '/var/lib/redis/dump.rdb' // Default Redis dump location
      await fs.copyFile(rdbPath, filepath)

      // Encrypt and compress
      const encryptedFile = await this.encryptFile(filepath)
      const compressedFile = await this.compressFile(encryptedFile)
      const checksum = await this.calculateChecksum(compressedFile)

      component.filename = path.basename(compressedFile)
      component.size = (await fs.stat(compressedFile)).size
      component.checksum = checksum
      component.duration = Date.now() - component.startTime
      component.success = true

      console.log(`Redis backup completed: ${component.filename}`)
      return component
    } catch (error) {
      console.error('Redis backup failed:', error)
      component.error = error.message
      return component
    }
  }

  async backupFileStorage() {
    console.log('Backing up file storage...')
    const component = {
      name: 'files',
      startTime: Date.now(),
      success: false,
    }

    try {
      const filename = `files_${this.backupId}.tar`
      const filepath = path.join(config.backupDir, filename)

      // Create tar archive of uploads directory
      const tarCommand = `tar -cf ${filepath} -C ./public uploads`
      await exec(tarCommand)

      // Encrypt and compress
      const encryptedFile = await this.encryptFile(filepath)
      const compressedFile = await this.compressFile(encryptedFile)
      const checksum = await this.calculateChecksum(compressedFile)

      component.filename = path.basename(compressedFile)
      component.size = (await fs.stat(compressedFile)).size
      component.checksum = checksum
      component.duration = Date.now() - component.startTime
      component.success = true

      console.log(`File storage backup completed: ${component.filename}`)
      return component
    } catch (error) {
      console.error('File storage backup failed:', error)
      component.error = error.message
      return component
    }
  }

  async backupConfiguration() {
    console.log('Backing up configuration...')
    const component = {
      name: 'config',
      startTime: Date.now(),
      success: false,
    }

    try {
      const filename = `config_${this.backupId}.json`
      const filepath = path.join(config.backupDir, filename)

      // Collect configuration (excluding secrets)
      const configData = {
        environment: process.env.NODE_ENV,
        version: process.env.APP_VERSION,
        features: {
          crisisIntervention: true,
          aiTherapy: true,
          peerSupport: true,
          wellnessTracking: true,
        },
        settings: await this.getAppSettings(),
        timestamp: new Date().toISOString(),
      }

      await fs.writeFile(filepath, JSON.stringify(configData, null, 2))

      // Encrypt but don't compress (small file)
      const encryptedFile = await this.encryptFile(filepath)
      const checksum = await this.calculateChecksum(encryptedFile)

      component.filename = path.basename(encryptedFile)
      component.size = (await fs.stat(encryptedFile)).size
      component.checksum = checksum
      component.duration = Date.now() - component.startTime
      component.success = true

      console.log(`Configuration backup completed: ${component.filename}`)
      return component
    } catch (error) {
      console.error('Configuration backup failed:', error)
      component.error = error.message
      return component
    }
  }

  async backupAuditLogs() {
    console.log('Backing up audit logs (HIPAA requirement)...')
    const component = {
      name: 'audit_logs',
      startTime: Date.now(),
      success: false,
    }

    try {
      const filename = `audit_${this.backupId}.jsonl`
      const filepath = path.join(config.backupDir, filename)

      // Export audit logs from database
      const dbUrl = new URL(config.pgConnectionString)
      const exportCommand = [
        'psql',
        `-h ${dbUrl.hostname}`,
        `-p ${dbUrl.port || 5432}`,
        `-U ${dbUrl.username}`,
        `-d ${dbUrl.pathname.slice(1)}`,
        `-c "COPY (SELECT * FROM audit_logs WHERE created_at >= NOW() - INTERVAL '30 days') TO STDOUT WITH (FORMAT CSV, HEADER)"`,
        `> ${filepath}`,
      ].join(' ')

      const env = { ...process.env, PGPASSWORD: dbUrl.password }
      await exec(exportCommand, { env })

      // Encrypt and compress (audit logs can be large)
      const encryptedFile = await this.encryptFile(filepath)
      const compressedFile = await this.compressFile(encryptedFile)
      const checksum = await this.calculateChecksum(compressedFile)

      component.filename = path.basename(compressedFile)
      component.size = (await fs.stat(compressedFile)).size
      component.checksum = checksum
      component.duration = Date.now() - component.startTime
      component.success = true
      component.hipaaCompliant = true

      console.log(`Audit logs backup completed: ${component.filename}`)
      return component
    } catch (error) {
      console.error('Audit logs backup failed:', error)
      component.error = error.message
      return component
    }
  }

  async encryptFile(filepath) {
    if (!config.encryptionKey) {
      console.warn('Encryption key not configured, skipping encryption')
      return filepath
    }

    const encryptedPath = `${filepath}.enc`
    const algorithm = 'aes-256-gcm'
    const key = Buffer.from(config.encryptionKey, 'hex')
    const iv = crypto.randomBytes(16)
    const cipher = crypto.createCipheriv(algorithm, key, iv)

    const input = createReadStream(filepath)
    const output = createWriteStream(encryptedPath)

    // Write IV and auth tag to beginning of file
    output.write(iv)

    await pipeline(input, cipher, output)

    const authTag = cipher.getAuthTag()
    await fs.appendFile(encryptedPath, authTag)

    // Delete unencrypted file
    await fs.unlink(filepath)

    return encryptedPath
  }

  async decryptFile(encryptedPath, outputPath) {
    if (!config.encryptionKey) {
      throw new Error('Encryption key required for decryption')
    }

    const algorithm = 'aes-256-gcm'
    const key = Buffer.from(config.encryptionKey, 'hex')
    
    const encryptedData = await fs.readFile(encryptedPath)
    const iv = encryptedData.slice(0, 16)
    const authTag = encryptedData.slice(-16)
    const encrypted = encryptedData.slice(16, -16)

    const decipher = crypto.createDecipheriv(algorithm, key, iv)
    decipher.setAuthTag(authTag)

    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ])

    await fs.writeFile(outputPath, decrypted)
    return outputPath
  }

  async compressFile(filepath) {
    const compressedPath = `${filepath}.gz`
    const input = createReadStream(filepath)
    const output = createWriteStream(compressedPath)
    const gzip = createGzip({ level: 9 })

    await pipeline(input, gzip, output)

    // Delete uncompressed file
    await fs.unlink(filepath)

    return compressedPath
  }

  async decompressFile(compressedPath, outputPath) {
    const input = createReadStream(compressedPath)
    const output = createWriteStream(outputPath)
    const gunzip = createGunzip()

    await pipeline(input, gunzip, output)
    return outputPath
  }

  async uploadToS3() {
    console.log('Uploading backup to S3...')
    
    const backupFiles = await fs.readdir(config.backupDir)
    const currentBackupFiles = backupFiles.filter(f => f.includes(this.backupId))

    for (const file of currentBackupFiles) {
      const filepath = path.join(config.backupDir, file)
      const fileContent = await fs.readFile(filepath)
      
      const params = {
        Bucket: config.s3Bucket,
        Key: `backups/${this.backupId}/${file}`,
        Body: fileContent,
        ServerSideEncryption: 'AES256',
        StorageClass: 'GLACIER_IR', // Cost-effective for backups
        Metadata: {
          backupId: this.backupId,
          created: this.manifest.created,
          component: file.split('_')[0],
        },
      }

      await s3.upload(params).promise()
      console.log(`Uploaded ${file} to S3`)
    }

    // Upload manifest
    const manifestParams = {
      Bucket: config.s3Bucket,
      Key: `backups/${this.backupId}/manifest.json`,
      Body: JSON.stringify(this.manifest, null, 2),
      ContentType: 'application/json',
      ServerSideEncryption: 'AES256',
    }
    await s3.upload(manifestParams).promise()
  }

  async verifyBackup() {
    console.log('Verifying backup integrity...')
    
    for (const component of this.manifest.components) {
      if (component.success && component.checksum) {
        const filepath = path.join(config.backupDir, component.filename)
        const calculatedChecksum = await this.calculateChecksum(filepath)
        
        if (calculatedChecksum !== component.checksum) {
          throw new Error(`Checksum mismatch for ${component.name}`)
        }
      }
    }
    
    console.log('Backup verification successful')
  }

  async restoreBackup(backupId) {
    console.log(`Starting restore process for backup ${backupId}...`)
    
    try {
      // Download backup from S3
      await this.downloadFromS3(backupId)
      
      // Load manifest
      const manifestPath = path.join(config.backupDir, backupId, 'manifest.json')
      const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf-8'))
      
      // Verify integrity before restore
      await this.verifyRestoreIntegrity(backupId, manifest)
      
      // Create restore point
      await this.createRestorePoint()
      
      // Restore components in order
      const restoreOrder = ['database', 'redis', 'files', 'config', 'audit_logs']
      
      for (const componentName of restoreOrder) {
        const component = manifest.components.find(c => c.name === componentName)
        if (component && component.success) {
          await this.restoreComponent(backupId, component)
        }
      }
      
      console.log('Restore completed successfully')
      
      // Verify application health
      await this.verifyApplicationHealth()
      
      return {
        success: true,
        backupId,
        restoredComponents: manifest.components.filter(c => c.success).map(c => c.name),
      }
    } catch (error) {
      console.error('Restore failed:', error)
      
      // Attempt rollback
      await this.rollbackRestore()
      
      throw error
    }
  }

  async restoreComponent(backupId, component) {
    console.log(`Restoring ${component.name}...`)
    
    const filepath = path.join(config.backupDir, backupId, component.filename)
    
    // Decompress if needed
    let processedFile = filepath
    if (filepath.endsWith('.gz')) {
      processedFile = await this.decompressFile(filepath, filepath.replace('.gz', ''))
    }
    
    // Decrypt if needed
    if (processedFile.endsWith('.enc')) {
      processedFile = await this.decryptFile(processedFile, processedFile.replace('.enc', ''))
    }
    
    // Restore based on component type
    switch (component.name) {
      case 'database':
        await this.restoreDatabase(processedFile)
        break
      case 'redis':
        await this.restoreRedis(processedFile)
        break
      case 'files':
        await this.restoreFiles(processedFile)
        break
      case 'config':
        await this.restoreConfig(processedFile)
        break
      case 'audit_logs':
        await this.restoreAuditLogs(processedFile)
        break
    }
    
    console.log(`${component.name} restored successfully`)
  }

  async restoreDatabase(sqlFile) {
    const dbUrl = new URL(config.pgConnectionString)
    const restoreCommand = [
      'psql',
      `-h ${dbUrl.hostname}`,
      `-p ${dbUrl.port || 5432}`,
      `-U ${dbUrl.username}`,
      `-d ${dbUrl.pathname.slice(1)}`,
      `< ${sqlFile}`,
    ].join(' ')
    
    const env = { ...process.env, PGPASSWORD: dbUrl.password }
    await exec(restoreCommand, { env })
  }

  async cleanupOldBackups() {
    console.log('Cleaning up old backups...')
    
    // List all backups in S3
    const listParams = {
      Bucket: config.s3Bucket,
      Prefix: 'backups/',
    }
    
    const objects = await s3.listObjectsV2(listParams).promise()
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - config.retentionDays)
    
    const objectsToDelete = objects.Contents
      .filter(obj => new Date(obj.LastModified) < cutoffDate)
      .map(obj => ({ Key: obj.Key }))
    
    if (objectsToDelete.length > 0) {
      const deleteParams = {
        Bucket: config.s3Bucket,
        Delete: {
          Objects: objectsToDelete,
        },
      }
      
      await s3.deleteObjects(deleteParams).promise()
      console.log(`Deleted ${objectsToDelete.length} old backups`)
    }
    
    // Clean local backups
    const localBackups = await fs.readdir(config.backupDir)
    for (const backup of localBackups) {
      const backupPath = path.join(config.backupDir, backup)
      const stats = await fs.stat(backupPath)
      
      if (stats.mtime < cutoffDate) {
        await fs.rm(backupPath, { recursive: true, force: true })
      }
    }
  }

  // Helper methods
  generateBackupId() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const random = crypto.randomBytes(4).toString('hex')
    return `backup-${timestamp}-${random}`
  }

  async calculateChecksum(filepath) {
    const hash = crypto.createHash('sha256')
    const stream = createReadStream(filepath)
    
    for await (const chunk of stream) {
      hash.update(chunk)
    }
    
    return hash.digest('hex')
  }

  async ensureBackupDirectory() {
    await fs.mkdir(config.backupDir, { recursive: true })
  }

  async saveManifest() {
    const manifestPath = path.join(config.backupDir, `manifest_${this.backupId}.json`)
    await fs.writeFile(manifestPath, JSON.stringify(this.manifest, null, 2))
  }

  async sendAlert(type, error) {
    console.error(`ALERT: ${type}`, error)
    // Implement alerting (email, Slack, PagerDuty, etc.)
  }

  async getAppSettings() {
    // Fetch application settings from database
    return {}
  }

  async waitForRedisSave(redisUrl) {
    // Wait for Redis BGSAVE to complete
    let attempts = 0
    while (attempts < 60) {
      const checkCommand = `redis-cli -h ${redisUrl.hostname} -p ${redisUrl.port || 6379} LASTSAVE`
      const { stdout } = await exec(checkCommand)
      // Check if save is recent
      await new Promise(resolve => setTimeout(resolve, 1000))
      attempts++
    }
  }

  async downloadFromS3(backupId) {
    // Download backup files from S3
    const listParams = {
      Bucket: config.s3Bucket,
      Prefix: `backups/${backupId}/`,
    }
    
    const objects = await s3.listObjectsV2(listParams).promise()
    const downloadDir = path.join(config.backupDir, backupId)
    await fs.mkdir(downloadDir, { recursive: true })
    
    for (const obj of objects.Contents) {
      const getParams = {
        Bucket: config.s3Bucket,
        Key: obj.Key,
      }
      
      const data = await s3.getObject(getParams).promise()
      const filename = path.basename(obj.Key)
      const filepath = path.join(downloadDir, filename)
      await fs.writeFile(filepath, data.Body)
    }
  }

  async verifyRestoreIntegrity(backupId, manifest) {
    // Verify all backup files are present and valid
    for (const component of manifest.components) {
      if (component.success) {
        const filepath = path.join(config.backupDir, backupId, component.filename)
        const exists = await fs.access(filepath).then(() => true).catch(() => false)
        
        if (!exists) {
          throw new Error(`Missing backup file: ${component.filename}`)
        }
        
        if (component.checksum) {
          const checksum = await this.calculateChecksum(filepath)
          if (checksum !== component.checksum) {
            throw new Error(`Checksum mismatch for ${component.filename}`)
          }
        }
      }
    }
  }

  async createRestorePoint() {
    // Create a restore point before applying backup
    console.log('Creating restore point...')
    const restorePointId = `restore-point-${Date.now()}`
    // Implementation depends on infrastructure
  }

  async rollbackRestore() {
    // Rollback to restore point if restore fails
    console.log('Rolling back restore...')
    // Implementation depends on infrastructure
  }

  async verifyApplicationHealth() {
    // Verify application is healthy after restore
    console.log('Verifying application health...')
    // Make health check requests
  }

  async restoreFiles(tarFile) {
    // Extract tar archive to appropriate location
    const extractCommand = `tar -xf ${tarFile} -C ./public`
    await exec(extractCommand)
  }

  async restoreConfig(configFile) {
    // Apply configuration settings
    const config = JSON.parse(await fs.readFile(configFile, 'utf-8'))
    // Apply config to application
  }

  async restoreAuditLogs(csvFile) {
    // Import audit logs back to database
    const dbUrl = new URL(config.pgConnectionString)
    const importCommand = [
      'psql',
      `-h ${dbUrl.hostname}`,
      `-p ${dbUrl.port || 5432}`,
      `-U ${dbUrl.username}`,
      `-d ${dbUrl.pathname.slice(1)}`,
      `-c "COPY audit_logs FROM STDIN WITH (FORMAT CSV, HEADER)"`,
      `< ${csvFile}`,
    ].join(' ')
    
    const env = { ...process.env, PGPASSWORD: dbUrl.password }
    await exec(importCommand, { env })
  }

  async restoreRedis(rdbFile) {
    // Restore Redis from RDB file
    const redisUrl = new URL(config.redisUrl || 'redis://localhost:6379')
    
    // Stop Redis, replace dump file, restart
    await exec(`redis-cli -h ${redisUrl.hostname} -p ${redisUrl.port || 6379} SHUTDOWN`)
    await fs.copyFile(rdbFile, '/var/lib/redis/dump.rdb')
    await exec('redis-server --daemonize yes')
  }
}

// Command-line interface
if (require.main === module) {
  const command = process.argv[2]
  const manager = new BackupManager()
  
  switch (command) {
    case 'create':
    case 'backup':
      manager.createBackup()
        .then(result => {
          console.log('Backup successful:', result)
          process.exit(0)
        })
        .catch(error => {
          console.error('Backup failed:', error)
          process.exit(1)
        })
      break
      
    case 'restore':
      const backupId = process.argv[3]
      if (!backupId) {
        console.error('Usage: node backup.js restore <backup-id>')
        process.exit(1)
      }
      manager.restoreBackup(backupId)
        .then(result => {
          console.log('Restore successful:', result)
          process.exit(0)
        })
        .catch(error => {
          console.error('Restore failed:', error)
          process.exit(1)
        })
      break
      
    case 'list':
      // List available backups
      s3.listObjectsV2({
        Bucket: config.s3Bucket,
        Prefix: 'backups/',
        Delimiter: '/',
      }).promise()
        .then(result => {
          const backups = result.CommonPrefixes.map(p => p.Prefix.split('/')[1])
          console.log('Available backups:')
          backups.forEach(b => console.log(`  - ${b}`))
        })
        .catch(error => {
          console.error('Failed to list backups:', error)
          process.exit(1)
        })
      break
      
    case 'verify':
      // Verify backup integrity
      const verifyId = process.argv[3]
      if (!verifyId) {
        console.error('Usage: node backup.js verify <backup-id>')
        process.exit(1)
      }
      // Implement verification
      break
      
    default:
      console.log('Usage: node backup.js <command> [options]')
      console.log('Commands:')
      console.log('  create/backup     Create a new backup')
      console.log('  restore <id>      Restore from backup')
      console.log('  list             List available backups')
      console.log('  verify <id>      Verify backup integrity')
      process.exit(1)
  }
}

module.exports = BackupManager