import { BaseEntity, Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import Contract from './Contract';

@Index('PK__deployme__3213E83F0AA8B78E', ['id'], { unique: true })
@Entity('deployment_log', { schema: 'dbo' })
export default class DeploymentLog extends BaseEntity {
  @PrimaryGeneratedColumn({ type: 'int', name: 'id' })
  public id: number;

  @Column('nvarchar', { name: 'name', nullable: true, length: 255 })
  public name: string | null;

  @Column('nvarchar', { name: 'detail', nullable: true })
  public detail: string | null;

  @Column('nvarchar', { name: 'status', nullable: true, length: 20 })
  public status: string | null;

  @Column('datetime', {
    name: 'created_at',
    nullable: true,
    default: () => 'getutcdate()',
  })
  public createdAt: Date | null;

  @Column('datetime', { name: 'updated_at', nullable: true })
  public updatedAt: Date | null;

  @ManyToOne(() => Contract, (contract) => contract.deploymentLogs, {
    lazy: true,
  })
  @JoinColumn([{ name: 'contract_id', referencedColumnName: 'id' }])
  public contract: Promise<Contract>;

  @Column({ type: 'int', name: 'contract_id' })
  public contractId: number;

  public constructor(init?: Partial<DeploymentLog>) {
    super();
    Object.assign(this, init);
  }
}
