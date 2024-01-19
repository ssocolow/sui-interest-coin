import { TransactionBlock } from "@mysten/sui.js/transactions";
import { Button, Container, TextField, Checkbox, Text, Flex} from "@radix-ui/themes";
import {
  useSignAndExecuteTransactionBlock,
  useSuiClient,
} from "@mysten/dapp-kit";
import { useNetworkVariable } from "./networkConfig";
import React, { useState } from 'react';


export function CreateCounter({
  onCreated,
}: {
  onCreated: (id: string) => void;
}) {
  const client = useSuiClient();
  const counterPackageId = useNetworkVariable("counterPackageId");
  const { mutate: signAndExecute } = useSignAndExecuteTransactionBlock();

  const [expirationSeconds, setExpirationSeconds] = useState('');
  const [interestAmount, setInterestAmount] = useState('');

  const handleCreate = () => {
    create(BigInt(expirationSeconds), BigInt(interestAmount));
  };

    const [isChecked, setIsChecked] = useState(false);
  
    const handleCheckboxChange = (e) => {
      // Read the value of the checkbox
      const checkedValue = e.target.checked;
  
      // Update state with the checkbox value
      setIsChecked(checkedValue);
    };
  
  return (
    <Container>
      <Button
        size="3"
        onClick={handleCreate}
      >
        Get A Treasury Bond
      </Button>

      <Text as="label" size="2">
  <Flex gap="2">
  <Checkbox 
        onChange={handleCheckboxChange}
        variant="classic" />
        Checked is positive rate, unchecked is negative rate
  </Flex>
</Text>

      
      <TextField.Root id="secs">
        <TextField.Input
          placeholder="Milliseconds till expiration"
          onChange={(e) => setExpirationSeconds(e.target.value)}
        />
      </TextField.Root>

      <TextField.Root id="amount">
        <TextField.Input
          placeholder="Amount of INTERESTCOIN"
          onChange={(e) => setInterestAmount(e.target.value)}
        />
      </TextField.Root>
    </Container>
  );

  function create(secs: bigint, amountToMint: bigint) {
    const txb = new TransactionBlock();

    if (isChecked) {
    txb.moveCall({
      arguments: [ txb.object("0x2595320055d8a3f2eba51541b78b28e1236209678798e4965fac24c02aead47d"), txb.pure(amountToMint), txb.pure(secs), txb.object("0x6"), txb.pure("2"), txb.pure("0")],
      target: `${counterPackageId}::interestcoin::locked_mint`,
    });
  } else {
    txb.moveCall({
      arguments: [ txb.object("0x2595320055d8a3f2eba51541b78b28e1236209678798e4965fac24c02aead47d"), txb.pure(amountToMint), txb.pure(secs), txb.object("0x6"), txb.pure("0"), txb.pure("2")],
      target: `${counterPackageId}::interestcoin::locked_mint`,
    });
  }

    signAndExecute(
      {
        transactionBlock: txb,
        options: {
          showEffects: true,
          showObjectChanges: true,
        },
      },
      {
        onSuccess: (tx) => {
          client
            .waitForTransactionBlock({
              digest: tx.digest,
            })
            .then(() => {
              const objectId = tx.effects?.created?.[0]?.reference?.objectId;

              if (objectId) {
                onCreated(objectId);
              }
            });
        },
      },
    );
  }
}
