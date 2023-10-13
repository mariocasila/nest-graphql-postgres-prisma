import {
  Resolver,
  Query,
  Mutation,
  Args,
  Int,
  ResolveField,
  Parent,
  Subscription,
} from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { ProjectType } from './gql/project.type';
import { UserType } from '../users/gql/user.type';
import { Project } from '@prisma/client';
import { UsersService } from '../users/users.service';
import { CreateProjectsInput } from './dto/create-projects.input';
import { PubSub } from 'graphql-subscriptions';
import { AuthGuard } from '../users/decorator/ auth.guard';

const pubSub = new PubSub();

@UseGuards(AuthGuard)
@Resolver(() => ProjectType)
export class ProjectsResolver {
  constructor(
    private readonly projectsService: ProjectsService,
    private usersService: UsersService,
  ) {}

  @Mutation(() => ProjectType)
  async createProject(
    @Args('createProjectsInput') createProjectsInput: CreateProjectsInput,
  ): Promise<Project> {
    try {
      const project = this.projectsService.createProject(
        createProjectsInput.title,
        createProjectsInput.userId,
      );

      pubSub.publish('projectCreated', { projectCreated: project });

      return project;
    } catch (e) {
      console.error('Error creating project:', e);
      throw new Error('Could not create project');
    }
  }

  @Query(() => [ProjectType])
  async projects(): Promise<Project[]> {
    return this.projectsService.findAllProjects();
  }

  @Query(() => [ProjectType])
  async projectsByUserId(
    @Args('userId', { type: () => Int }) userId: number,
  ): Promise<Project[]> {
    return this.projectsService.findProjectsByUserId(userId);
  }

  @ResolveField(() => UserType) // Resolver for the user field
  async user(@Parent() project: Project): Promise<UserType | null> {
    return this.usersService.findUserById(project.userId); // Fetch user based on userId from the project
  }

  //   @Subscription(() => ProjectType, {
  //     filter: (payload, variables) => {
  // console.log('subscription', payload);
  // console.log('subscription variables', variables);
  //       return payload.userId === variables.userId; // Only send update if userId matches
  //     },
  //   })
  @Subscription(() => ProjectType)
  projectCreated() {
    return pubSub.asyncIterator('projectCreated');
  }
}
