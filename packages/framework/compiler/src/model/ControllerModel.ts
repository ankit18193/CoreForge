export class ControllerModel {
  public readonly id: string;
  public readonly name: string;
  public readonly parentId: string;

  constructor(id: string, name: string, parentId: string) {
    this.id = id;
    this.name = name;
    this.parentId = parentId;
    Object.freeze(this);
  }
}
