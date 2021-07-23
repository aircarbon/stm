import { BaseEntity, Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Index('ix_wl_addr', ['addr'], { unique: true })
@Index('PK__whitelis__3213E83F4EA1567D', ['id'], { unique: true })
@Entity('whitelist_addr', { schema: 'dbo' })
export default class WhitelistAddr extends BaseEntity {
  @PrimaryGeneratedColumn({ type: 'int', name: 'id' })
  public id: number;

  @Column('nvarchar', { name: 'addr', length: 42 })
  public addr: string;

  public constructor(init?: Partial<WhitelistAddr>) {
    super();
    Object.assign(this, init);
  }
}
