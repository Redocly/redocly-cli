$form = new \PetStore\Entities\Pet();
$form->setPetId(1);
$form->setPetType("Dog");
$form->setName("Rex");
// set other fields
try {
    $pet = $client->pets()->update($form);
} catch (UnprocessableEntityException $e) {
    var_dump($e->getErrors());
}
