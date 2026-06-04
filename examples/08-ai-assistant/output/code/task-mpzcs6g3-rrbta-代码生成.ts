import { Repository, EntityRepository } from 'typeorm';
import { User } from '../entities/User';

@EntityRepository(User)
class UserRepository extends Repository<User> {

  async createUser(data: Partial<User>): Promise<User> {
    const entity = this.create(data);
    return await this.save(entity);
  }

  async updateUser(id: string, data: Partial<User>): Promise<User> {
    await this.update(id, data);
    return await this.findOne(id);
  }

  async deleteUser(id: string): Promise<void> {
    await this.delete(id);
  }

  async findAll(): Promise<User[]> {
    return await this.find();
  }

  async findById(id: string): Promise<User> {
    return await this.findOne(id);
  }
}

export default UserRepository;