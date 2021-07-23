import { BaseEntity, Column, Entity, Index, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import DeploymentLog from './DeploymentLog';

@Index('IDX_CONTRACT_ADDR', ['addr'], {})
@Index('IX_contract', ['deployedUtc'], {})
@Index('PK_contract', ['id'], { unique: true })
@Entity('contract', { schema: 'dbo' })
export default class Contract extends BaseEntity {
  @PrimaryGeneratedColumn({ type: 'int', name: 'id' })
  public id: number;

  @Column('nvarchar', { name: 'contract_enum', length: 50 })
  public contractEnum: string;

  @Column('int', { name: 'network_id' })
  public networkId: number;

  @Column('datetime', { name: 'deployed_utc' })
  public deployedUtc: Date;

  @Column('nvarchar', { name: 'addr', length: 42 })
  public addr: string;

  @Column('nvarchar', { name: 'host_name', length: 256 })
  public hostName: string;

  @Column('nvarchar', { name: 'ip_v4', length: 16 })
  public ipV4: string;

  @Column('nvarchar', { name: 'abi', length: 'max' })
  public abi: string;

  @Column('nvarchar', { name: 'contract_ver', nullable: true, length: 50 })
  public contractVer: string | null;

  @Column('nvarchar', { name: 'contract_type', nullable: true, length: 50 })
  public contractType: string | null;

  @Column('nvarchar', { name: 'txHash', nullable: true, length: 66 })
  public txHash: string | null;

  @Column('nvarchar', { name: 'symbol', nullable: true, length: 20 })
  public symbol: string | null;

  @OneToMany(() => DeploymentLog, (deploymentLog) => deploymentLog.contract, {
    lazy: true,
  })
  public deploymentLogs: Promise<DeploymentLog[]>;

  // UDF column
  @Column({ select: false, insert: false, readonly: true })
  public name: string;

  public constructor(init?: Partial<Contract>) {
    super();
    Object.assign(this, init);
  }
}
