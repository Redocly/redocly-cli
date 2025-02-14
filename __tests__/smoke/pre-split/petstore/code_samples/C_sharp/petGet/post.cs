PetStore.v1.Pet pet = new PetStore.v1.Pet();
pet.setApiKey("your api key");
pet.petType = PetStore.v1.Pet.TYPE_DOG;
pet.name = "Rex";
// set other fields
PetStoreResponse response = pet.create();
if (response.statusCode == HttpStatusCode.Created)
{
  // Successfully created
}
else
{
  // Something wrong -- check response for errors
  Console.WriteLine(response.getRawResponse());
}
